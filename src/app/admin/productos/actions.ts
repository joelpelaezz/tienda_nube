'use server';

import { db } from '@/lib/db';
import { products, productImages, productVariants, productVariantOptions, productStockMovements, variantTypes, variantOptions, productCategories, orderItems } from '@/drizzle/schema';
import { eq, desc, inArray, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { validateImageUrl } from '@/lib/image-validation';
import { getDiscountPercent, normalizeSimpleProductPrices, pesosToCents } from '@/lib/products/pricing';
import { requireAdmin } from '@/lib/auth';

// ─────────────────────────────────────────────────────────────
// Types for the new variant system
// ─────────────────────────────────────────────────────────────
export interface VariantTypeInput {
  id?: number;          // existing variant_type.id (null = new custom type)
  name: string;         // e.g. "Color", "Talle"
  optionIds: number[];  // selected variant_option.id values
}

export interface VariantCombination {
  optionIds: number[];  // combination of option IDs
  stock: number;
  price?: number;       // optional override (in cents)
  priceOffer?: number;  // optional offer override (in cents)
  imageUrl?: string | null;
}

export interface CreateProductInput {
  name: string;
  description?: string;
  price: number | null;
  priceOffer?: number;
  priceTransfer?: number;
  badge?: string;
  hasFreeShipping?: boolean;
  categoryIds?: number[];
  isVisible?: boolean;
  imageUrl?: string;
  imageUrls?: string[];
  // Shipping / physical
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  // Inventory
  sku?: string;
  barcode?: string;
  // Type
  productType?: string;
  stock?: number;
  // SEO
  seoTitle?: string;
  seoDescription?: string;
  // Variants
  variantTypes?: VariantTypeInput[];
  variantCombinations?: VariantCombination[];
}

// ─────────────────────────────────────────────────────────────
// Create product
// ─────────────────────────────────────────────────────────────
export async function createProduct(data: CreateProductInput) {
  // C4-TRACE: Phase 1 — admin-only mutation.
  await requireAdmin();

  const hasVariants = (data.variantCombinations?.length ?? 0) > 0;
  const initialStock = data.stock ?? 0;
  if (!Number.isInteger(initialStock) || initialStock < 0) {
    throw new Error('El stock debe ser un número entero mayor o igual a 0.');
  }
  if (data.price == null && !hasVariants) {
    throw new Error('El precio es obligatorio para productos sin variantes.');
  }
  if ((data.price != null && data.price < 0) || (data.priceOffer != null && data.priceOffer < 0)) {
    throw new Error('Los precios no pueden ser negativos.');
  }
  if (data.priceOffer != null && (data.price == null || data.priceOffer >= data.price)) {
    throw new Error('La oferta general debe ser menor que el precio regular.');
  }
  if ((data.variantCombinations ?? []).some((variant) => variant.priceOffer != null && variant.price != null && variant.priceOffer >= variant.price)) {
    throw new Error('La oferta de cada variante debe ser menor que su precio regular.');
  }

  // Generate base slug
  let baseSlug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  // Ensure slug uniqueness
  let slug = baseSlug;
  let counter = 1;
  while (true) {
    const existing = await db
      .select({ id: products.id })
      .from(products)
      .where(eq(products.slug, slug))
      .limit(1);
    if (existing.length === 0) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  const categoryIds = Array.from(new Set(data.categoryIds ?? []));
  const [product] = await db.insert(products).values({
    name: data.name,
    slug,
    description: data.description || null,
    price: hasVariants ? null : data.price,
    priceOffer: data.priceOffer || null,
    priceTransfer: data.priceTransfer || null,
    discount: getDiscountPercent(data.price, data.priceOffer)?.toString() ?? null,
    badge: data.badge || null,
    hasFreeShipping: data.hasFreeShipping ?? false,
    isVisible: data.isVisible ?? true,
    stock: hasVariants || data.productType === 'digital' ? 0 : initialStock,
    weight: data.weight || null,
    length: data.length || null,
    width: data.width || null,
    height: data.height || null,
    sku: data.sku || null,
    barcode: data.barcode || null,
    productType: data.productType || 'physical',
    seoTitle: data.seoTitle || null,
    seoDescription: data.seoDescription || null,
  }).returning();

  if (!hasVariants && data.productType !== 'digital' && initialStock > 0) {
    await db.insert(productStockMovements).values({
      productId: product.id,
      movementType: 'creacion',
      quantity: initialStock,
      stockAfter: initialStock,
    });
  }

  // Create initial image if URL provided (validated)
  const imageUrls = Array.from(new Set([...(data.imageUrls ?? []), ...(data.imageUrl ? [data.imageUrl] : [])]));
  if (imageUrls.length > 0) {
    for (let position = 0; position < imageUrls.length; position++) {
      const url = imageUrls[position];
      const validation = validateImageUrl(url);
      if (!validation.valid) throw new Error(validation.reason);
      await db.insert(productImages).values({ productId: product.id, url, alt: data.name, position });
    }
  }

  if (categoryIds.length > 0) {
    await db.insert(productCategories).values(categoryIds.map((categoryId) => ({ productId: product.id, categoryId })));
  }

  // Create variants from combinations
  if (data.variantCombinations && data.variantCombinations.length > 0) {
    const optionIds = Array.from(new Set(data.variantCombinations.flatMap((combo) => combo.optionIds)));
    const optionRows = optionIds.length
      ? await db.select({ id: variantOptions.id, value: variantOptions.value, variantTypeId: variantOptions.variantTypeId }).from(variantOptions).where(inArray(variantOptions.id, optionIds))
      : [];
    const optionNames = new Map(optionRows.map((option) => [option.id, option.value]));
    const variantRows = data.variantCombinations.map((combo) => ({
      productId: product.id,
      name: combo.optionIds.map((optionId) => optionNames.get(optionId) ?? String(optionId)).join(' / '),
      stock: combo.stock,
      price: combo.price ?? 0,
      priceOffer: combo.priceOffer ?? null,
      imageUrl: combo.imageUrl ?? null,
      variantTypeId: optionRows.find((option) => option.id === combo.optionIds[0])?.variantTypeId ?? null,
      isVisible: true,
    }));
    const insertedVariants = await db.insert(productVariants).values(variantRows).returning({ id: productVariants.id });
    const relations = data.variantCombinations.flatMap((combo, index) => combo.optionIds.map((variantOptionId, position) => ({
      productVariantId: insertedVariants[index].id,
      variantOptionId,
      position,
    })));
    if (relations.length > 0) await db.insert(productVariantOptions).values(relations);
  }

  revalidatePath('/admin/productos');
  return product;
}

export async function submitProductEdit(id: number, formData: FormData) {
  // C4-TRACE: Phase 1 — admin-only mutation.
  await requireAdmin();

  const name = formData.get('name') as string;
  const description = (formData.get('description') as string) || undefined;
  const priceRaw = parseFloat(formData.get('price') as string);
  const price = Number.isFinite(priceRaw) ? priceRaw : undefined;
  const priceOfferRaw = parseFloat(formData.get('priceOffer') as string);
  const priceOffer = Number.isFinite(priceOfferRaw) ? priceOfferRaw : undefined;
  const priceTransferRaw = parseFloat(formData.get('priceTransfer') as string);
  const priceTransfer = Number.isFinite(priceTransferRaw) ? priceTransferRaw : undefined;

  // Changing visibility must not be blocked by an already-invalid historical
  // offer. Validate only when the submitted price data actually changes.
  const [currentProduct, existingVariants] = await Promise.all([
    db
      .select({
        price: products.price,
        priceOffer: products.priceOffer,
        stock: products.stock,
        reservedStock: products.reservedStock,
        productType: products.productType,
      })
      .from(products)
      .where(eq(products.id, id))
      .limit(1),
    db
      .select({ id: productVariants.id })
      .from(productVariants)
      .where(eq(productVariants.productId, id)),
  ]);
  if (price === undefined && existingVariants.length === 0) {
    throw new Error('El precio es obligatorio y debe ser un número válido');
  }
  const currentPrice = currentProduct[0]?.price;
  const currentPriceOffer = currentProduct[0]?.priceOffer;
  const submittedPrice = pesosToCents(price);
  // C4-TRACE: enforce the zero-base-price invariant server-side; confirmation is only UX.
  const normalizedSpecialPrices = normalizeSimpleProductPrices(
    submittedPrice,
    priceOffer !== undefined ? Math.round(priceOffer * 100) : null,
    priceTransfer !== undefined ? Math.round(priceTransfer * 100) : null,
    existingVariants.length > 0,
  );
  const submittedPriceOffer = normalizedSpecialPrices.offerPrice;
  const submittedPriceTransfer = normalizedSpecialPrices.transferPrice;
  const pricesChanged = currentPrice !== submittedPrice || currentPriceOffer !== submittedPriceOffer;

  if (pricesChanged && submittedPriceOffer !== null && (submittedPrice === null || submittedPriceOffer >= submittedPrice)) {
    throw new Error('La oferta general debe ser menor que el precio regular.');
  }
  const badge = (formData.get('badge') as string) || undefined;
  const hasFreeShipping = formData.get('hasFreeShipping') === 'on';
  const visibility = formData.get('visibility');
  const isVisible = visibility === 'visible';
  const weight = parseInt(formData.get('weight') as string) || undefined;
  const length = parseInt(formData.get('length') as string) || undefined;
  const width = parseInt(formData.get('width') as string) || undefined;
  const height = parseInt(formData.get('height') as string) || undefined;
  const sku = (formData.get('sku') as string) || undefined;
  const barcode = (formData.get('barcode') as string) || undefined;
  const productType = (formData.get('productType') as string) || 'physical';
  const seoTitle = (formData.get('seoTitle') as string) || undefined;
  const seoDescription = (formData.get('seoDescription') as string) || undefined;
  const variantPriceMode = formData.get('variantPriceMode');
  const confirmApplyAll = formData.get('confirmApplyAll') === 'on';

  if (variantPriceMode === 'all' && !confirmApplyAll) {
    throw new Error('Confirmá aplicar el precio a todas las variantes.');
  }
  if (variantPriceMode === 'all' && submittedPrice == null) {
    throw new Error('Ingresá un precio general antes de aplicarlo a todas las variantes.');
  }

  // Generate slug from name
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const updates: Record<string, any> = {
    name,
    slug,
    description: description || null,
    // Convert from pesos (display) to cents (DB)
    price: submittedPrice,
    priceOffer: submittedPriceOffer,
    priceTransfer: submittedPriceTransfer,
    discount: getDiscountPercent(submittedPrice, submittedPriceOffer)?.toString() ?? null,
    badge: badge || null,
    hasFreeShipping,
    isVisible,
    weight: weight || null,
    length: length || null,
    width: width || null,
    height: height || null,
    sku: sku || null,
    barcode: barcode || null,
    productType,
    seoTitle: seoTitle || null,
    seoDescription: seoDescription || null,
  };

  await db.update(products).set(updates).where(eq(products.id, id));

  // A null variant price means "inherit the product price". Keep those
  // variants inherited when the product price changes; only the explicit
  // "all" mode replaces custom variant prices.
  if (variantPriceMode === 'all' && pricesChanged) {
    await db
      .update(productVariants)
      .set({ price: submittedPrice, priceOffer: submittedPriceOffer })
      .where(eq(productVariants.productId, id));
  }

  // Stock is only editable here for physical products without variants; variant
  // stock is managed from the inventory module. Keep an audit trail per change.
  const stockRaw = formData.get('stock');
  const tracksSimpleStock =
    existingVariants.length === 0 && (currentProduct[0]?.productType ?? 'physical') !== 'digital';
  if (tracksSimpleStock && stockRaw !== null && String(stockRaw).trim() !== '') {
    const nextStock = Number(stockRaw);
    if (!Number.isInteger(nextStock) || nextStock < 0) {
      throw new Error('El stock debe ser un número entero mayor o igual a 0.');
    }
    const currentStock = currentProduct[0]?.stock ?? 0;
    const reserved = currentProduct[0]?.reservedStock ?? 0;
    if (nextStock < reserved) {
      throw new Error(
        `No podés dejar el stock en ${nextStock}: hay ${reserved} unidades reservadas por pedidos.`
      );
    }
    if (nextStock !== currentStock) {
      await db.transaction(async (tx) => {
        await tx.update(products).set({ stock: nextStock }).where(eq(products.id, id));
        await tx.insert(productStockMovements).values({
          productId: id,
          movementType: 'ajuste',
          quantity: nextStock - currentStock,
          stockAfter: nextStock,
        });
      });
      revalidatePath('/admin/inventario');
    }
  }

  revalidatePath('/admin/productos');
  revalidatePath(`/admin/productos/${id}`);
}

export async function updateProduct(id: number, data: {
  name?: string;
  description?: string;
  price?: number;
  priceOffer?: number;
  priceTransfer?: number;
  discount?: string;
  badge?: string;
  hasFreeShipping?: boolean;
  isVisible?: boolean;
}) {
  // C4-TRACE: Phase 1 — admin-only mutation.
  await requireAdmin();

  const updates: Record<string, any> = { ...data };

  if (data.name) {
    updates.slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  // Convert prices from pesos (display) back to cents (DB) if provided
  // Admin form displays prices divided by 100 (e.g. shows "250" for $250 = 25000 cents)
  if (updates.price !== undefined) {
    updates.price = Math.round(updates.price * 100);
  }
  if (updates.priceOffer !== undefined) {
    updates.priceOffer = updates.priceOffer ? Math.round(updates.priceOffer * 100) : null;
  }
  if (updates.priceTransfer !== undefined) {
    updates.priceTransfer = updates.priceTransfer ? Math.round(updates.priceTransfer * 100) : null;
  }

  await db.update(products).set(updates).where(eq(products.id, id));
  revalidatePath('/admin/productos');
  revalidatePath(`/admin/productos/${id}`);
}

export async function deleteProduct(id: number) {
  // C4-TRACE: Phase 1 — admin-only mutation.
  await requireAdmin();

  // Delete variants first
  await db.delete(productVariants).where(eq(productVariants.productId, id));
  // Delete images
  await db.delete(productImages).where(eq(productImages.productId, id));
  // Delete product
  await db.delete(products).where(eq(products.id, id));

  revalidatePath('/admin/productos');
}

export async function addProductImage(productId: number, url: string, alt?: string, src: 'url' | 'file' = 'url') {
  // C4-TRACE: Phase 1 — admin-only mutation.
  await requireAdmin();

  if (src === 'url') {
    const validation = validateImageUrl(url);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }
  }

  const existing = await db
    .select({ maxPos: productImages.position })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(desc(productImages.position))
    .limit(1);

  const position = existing[0]?.maxPos != null ? existing[0].maxPos + 1 : 0;

  await db.insert(productImages).values({
    productId,
    url,
    alt: alt || null,
    position,
    src,
  });

  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/admin/productos');
}

export async function deleteProductImage(imageId: number, productId: number) {
  // C4-TRACE: Phase 1 — admin-only mutation.
  await requireAdmin();

  await db.delete(productImages).where(eq(productImages.id, imageId));
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/admin/productos');
}

export async function uploadProductImage(productId: number, url: string, src: 'url' | 'file' = 'url', alt?: string) {
  // C4-TRACE: Phase 1 — admin-only mutation.
  await requireAdmin();

  if (src === 'url') {
    const validation = validateImageUrl(url);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }
  }

  const existing = await db
    .select({ maxPos: productImages.position })
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(desc(productImages.position))
    .limit(1);

  const position = existing[0]?.maxPos != null ? existing[0].maxPos + 1 : 0;

  const [inserted] = await db.insert(productImages).values({
    productId,
    url,
    alt: alt || null,
    position,
    src,
  }).returning({ id: productImages.id });

  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/admin/productos');
  return inserted;
}

export async function setImageAsPrimary(productId: number, imageId: number) {
  // C4-TRACE: Phase 1 — admin-only mutation.
  await requireAdmin();

  // Get all images for this product ordered by position
  const images = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, productId))
    .orderBy(productImages.position);

  // The target image should be at position 0
  // Others shift down: if target was at position X, it goes to 0, and positions 0..X-1 shift to 1..X
  const imagePositions: { id: number; position: number }[] = [];
  let insertPosition = 0;

  for (const img of images) {
    if (img.id === imageId) {
      imagePositions.push({ id: img.id, position: 0 });
    } else {
      imagePositions.push({ id: img.id, position: insertPosition });
      insertPosition++;
    }
  }

  for (const { id, position } of imagePositions) {
    await db
      .update(productImages)
      .set({ position })
      .where(eq(productImages.id, id));
  }
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/admin/productos');
}

export async function setImagePosition(productId: number, imagePositions: { id: number; position: number }[]) {
  // C4-TRACE: Phase 1 — admin-only mutation.
  await requireAdmin();

  for (const { id, position } of imagePositions) {
    await db
      .update(productImages)
      .set({ position })
      .where(eq(productImages.id, id));
  }
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/admin/productos');
}

export async function deleteMultipleImages(imageIds: number[], productId: number) {
  // C4-TRACE: Phase 1 — admin-only mutation.
  await requireAdmin();

  if (imageIds.length === 0) return;
  await db.delete(productImages).where(inArray(productImages.id, imageIds));
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/admin/productos');
}

// ─────────────────────────────────────────────────────────────
// Variant Types
// ─────────────────────────────────────────────────────────────
export async function createVariantType(
  name: string,
  optionValues: Array<string | { value: string; colorHex?: string; imageUrl?: string }>,
  presentation: 'text' | 'color' | 'image' = 'text',
) {
  // C4-TRACE: Phase 1 — admin-only mutation.
  await requireAdmin();

  // Create the variant type
  const [vt] = await db.insert(variantTypes).values({ name, presentation }).returning();

  // Create all options
  if (optionValues.length > 0) {
    const optionRows = optionValues.map((option) => ({
      variantTypeId: vt.id,
      value: typeof option === 'string' ? option.trim() : option.value.trim(),
      colorHex: typeof option === 'string' ? null : option.colorHex || null,
      imageUrl: typeof option === 'string' ? null : option.imageUrl || null,
    }));
    await db.insert(variantOptions).values(optionRows);
  }

  revalidatePath('/admin/productos/new');
  return vt;
}

// ─────────────────────────────────────────────────────────────
// Product Variants Management
// ─────────────────────────────────────────────────────────────

export async function getProductVariants(productId: number) {
  const variants = await db
    .select()
    .from(productVariants)
    .where(eq(productVariants.productId, productId));
  return variants;
}

export interface SaveVariantInput {
  id?: number;       // existing variant id (null = new)
  optionIds: number[];
  stock: number;
  price?: number | null;      // regular price override in cents
  priceOffer?: number | null; // offer price override in cents
  imageUrl?: string | null;
  isVisible: boolean;
}

export async function saveProductVariants(productId: number, variants: SaveVariantInput[]) {
  // C4-TRACE: Phase 1 — admin-only mutation.
  await requireAdmin();

  if (variants.some((variant) => variant.priceOffer != null && variant.price != null && variant.priceOffer >= variant.price)) {
    throw new Error('La oferta de cada variante debe ser menor que su precio regular.');
  }
  const existingVariants = await db
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(and(eq(productVariants.productId, productId), eq(productVariants.isVisible, true)));
  const existingIds = new Set(existingVariants.map((variant) => variant.id));
  const requestedIds = variants.flatMap((variant) => variant.id == null ? [] : [variant.id]);
  if (new Set(requestedIds).size !== requestedIds.length || requestedIds.some((id) => !existingIds.has(id))) {
    throw new Error('La lista de variantes contiene identificadores repetidos o ajenos al producto.');
  }

  const optionIds = Array.from(new Set(variants.flatMap((variant) => variant.optionIds)));
  const optionRows = optionIds.length
    ? await db.select({ id: variantOptions.id, value: variantOptions.value, variantTypeId: variantOptions.variantTypeId }).from(variantOptions).where(inArray(variantOptions.id, optionIds))
    : [];
  if (optionRows.length !== optionIds.length) throw new Error('Una o más opciones de variante ya no existen.');

  await db.transaction(async (tx) => {
    const requestedIdSet = new Set(requestedIds);
    const removedIds = existingVariants.map((variant) => variant.id).filter((id) => !requestedIdSet.has(id));
    if (removedIds.length > 0) {
      // Keep historical order references, reservations and stock-movement rows intact.
      await tx.update(productVariants)
        .set({ isVisible: false })
        .where(and(eq(productVariants.productId, productId), inArray(productVariants.id, removedIds)));
    }

    for (const variant of variants) {
      const name = variant.optionIds
        .map((optionId) => optionRows.find((option) => option.id === optionId)?.value ?? String(optionId))
        .join(' / ');
      const variantTypeId = optionRows.find((option) => option.id === variant.optionIds[0])?.variantTypeId ?? null;
      let variantId = variant.id;

      if (variantId != null) {
        await tx.update(productVariants)
          .set({
            name,
            price: variant.price ?? null,
            priceOffer: variant.priceOffer ?? null,
            imageUrl: variant.imageUrl || null,
            variantTypeId,
            isVisible: variant.isVisible,
          })
          .where(and(eq(productVariants.id, variantId), eq(productVariants.productId, productId)));
        await tx.delete(productVariantOptions).where(eq(productVariantOptions.productVariantId, variantId));
      } else {
        const [inserted] = await tx.insert(productVariants).values({
          productId,
          name,
          stock: variant.stock,
          price: variant.price ?? 0,
          priceOffer: variant.priceOffer ?? null,
          imageUrl: variant.imageUrl || null,
          variantTypeId,
          isVisible: variant.isVisible,
        }).returning({ id: productVariants.id });
        variantId = inserted.id;
      }

      if (variant.optionIds.length > 0) {
        await tx.insert(productVariantOptions).values(variant.optionIds.map((variantOptionId, position) => ({
          productVariantId: variantId!,
          variantOptionId,
          position,
        })));
      }
    }
  });

  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/admin/productos');
}

export async function updateProductVariantImages(productId: number, images: { optionIds: number[]; imageUrl: string | null }[]) {
  // C4-TRACE: Phase 1 — admin-only mutation.
  await requireAdmin();

  const variants = await db.select().from(productVariants).where(eq(productVariants.productId, productId));
  const relations = variants.length > 0
    ? await db.select().from(productVariantOptions).where(inArray(productVariantOptions.productVariantId, variants.map((variant) => variant.id)))
    : [];
  for (const variant of variants) {
    const match = images.find((item) => {
      const current = relations.filter((relation) => relation.productVariantId === variant.id).map((relation) => relation.variantOptionId).sort((a, b) => a - b);
      const incoming = [...item.optionIds].sort((a, b) => a - b);
      return current.length === incoming.length && current.every((id, index) => id === incoming[index]);
    });
    if (match) await db.update(productVariants).set({ imageUrl: match.imageUrl }).where(eq(productVariants.id, variant.id));
  }
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath(`/productos`);
}

export async function deleteProductVariant(variantId: number, productId: number) {
  // C4-TRACE: Phase 1 — admin-only mutation.
  await requireAdmin();

  await db.delete(productVariants).where(eq(productVariants.id, variantId));
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/admin/productos');
}

export async function updateProductCategories(productId: number, categoryIds: number[]) {
  // C4-TRACE: Phase 1 — admin-only mutation.
  await requireAdmin();

  // Delete all existing associations
  await db.delete(productCategories).where(eq(productCategories.productId, productId));

  // Insert new associations
  if (categoryIds.length > 0) {
    await db.insert(productCategories).values(
      categoryIds.map((categoryId) => ({ productId, categoryId }))
    );
  }

  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/admin/productos');
}

export type BulkProductAction =
  | { type: 'visibility'; isVisible: boolean }
  | { type: 'category'; mode: 'add' | 'replace' | 'remove'; categoryId: number }
  | { type: 'badge'; badge: string | null }
  | { type: 'price'; target: 'regular' | 'offer' | 'both'; mode: 'percent' | 'fixed'; value: number; direction: 'increase' | 'decrease' }
  | { type: 'delete' };

export async function bulkUpdateProducts(productIds: number[], action: BulkProductAction) {
  // C4-TRACE: Bulk product mutations are admin-only and validated before applying.
  await requireAdmin();

  const ids = Array.from(new Set(productIds.filter((id) => Number.isInteger(id) && id > 0)));
  if (ids.length === 0 || ids.length > 100) throw new Error('Seleccioná entre 1 y 100 productos.');
  let deletionResult: { deletedIds: number[]; blockedIds: number[] } | undefined;

  await db.transaction(async (tx) => {
    if (action.type === 'delete') {
      const selectedVariants = await tx
        .select({ id: productVariants.id, productId: productVariants.productId })
        .from(productVariants)
        .where(inArray(productVariants.productId, ids));
      const variantIds = selectedVariants.map((variant) => variant.id);
      const variantProductIds = new Map(selectedVariants.map((variant) => [variant.id, variant.productId]));
      const usedProductIds = new Set<number>();

      const directOrderItems = await tx
        .select({ productId: orderItems.productId })
        .from(orderItems)
        .where(inArray(orderItems.productId, ids));
      directOrderItems.forEach((item) => {
        if (item.productId != null) usedProductIds.add(item.productId);
      });

      if (variantIds.length > 0) {
        const variantOrderItems = await tx
          .select({ variantId: orderItems.variantId })
          .from(orderItems)
          .where(inArray(orderItems.variantId, variantIds));
        variantOrderItems.forEach((item) => {
          const productId = item.variantId == null ? undefined : variantProductIds.get(item.variantId);
          if (productId != null) usedProductIds.add(productId);
        });
      }

      const deletableIds = ids.filter((id) => !usedProductIds.has(id));
      deletionResult = { deletedIds: deletableIds, blockedIds: ids.filter((id) => usedProductIds.has(id)) };
      if (deletableIds.length > 0) {
        const deletableVariants = selectedVariants.filter((variant) => deletableIds.includes(variant.productId));
        const deletableVariantIds = deletableVariants.map((variant) => variant.id);
        if (deletableVariantIds.length > 0) {
          await tx.delete(productVariantOptions).where(inArray(productVariantOptions.productVariantId, deletableVariantIds));
          await tx.delete(productVariants).where(inArray(productVariants.id, deletableVariantIds));
        }
        await tx.delete(productImages).where(inArray(productImages.productId, deletableIds));
        await tx.delete(productCategories).where(inArray(productCategories.productId, deletableIds));
        await tx.delete(products).where(inArray(products.id, deletableIds));
      }
      return;
    }

    if (action.type === 'visibility') {
      await tx.update(products).set({ isVisible: action.isVisible }).where(inArray(products.id, ids));
      return;
    }

    if (action.type === 'badge') {
      await tx.update(products).set({ badge: action.badge?.trim() || null }).where(inArray(products.id, ids));
      return;
    }

    if (action.type === 'category') {
      if (!Number.isInteger(action.categoryId) || action.categoryId <= 0) throw new Error('Categoría inválida.');
      if (action.mode === 'replace') {
        await tx.delete(productCategories).where(inArray(productCategories.productId, ids));
      }
      if (action.mode === 'remove') {
        await tx.delete(productCategories).where(and(
          inArray(productCategories.productId, ids),
          eq(productCategories.categoryId, action.categoryId),
        ));
        return;
      }
      await tx.insert(productCategories).values(ids.map((productId) => ({ productId, categoryId: action.categoryId }))).onConflictDoNothing();
      return;
    }

    if (!Number.isFinite(action.value) || action.value < 0) throw new Error('El ajuste de precio debe ser un número positivo.');
    const selectedProducts = await tx.select({ id: products.id, price: products.price, priceOffer: products.priceOffer }).from(products).where(inArray(products.id, ids));
    for (const product of selectedProducts) {
      const adjust = (current: number | null) => {
        if (current == null) return null;
        const delta = action.mode === 'percent' ? Math.round(current * action.value / 100) : Math.round(action.value * 100);
        return Math.max(0, action.direction === 'increase' ? current + delta : current - delta);
      };
      const price = action.target === 'offer' ? product.price : adjust(product.price);
      const priceOffer = action.target === 'regular' ? product.priceOffer : adjust(product.priceOffer);
      if (priceOffer != null && price != null && priceOffer >= price) throw new Error(`El ajuste deja una oferta inválida en el producto ${product.id}.`);
      await tx.update(products).set({ price, priceOffer }).where(eq(products.id, product.id));
    }
  });

  revalidatePath('/admin/productos');
  return deletionResult;
}

export async function getProductCategories(productId: number): Promise<number[]> {
  const rows = await db
    .select({ categoryId: productCategories.categoryId })
    .from(productCategories)
    .where(eq(productCategories.productId, productId));
  return rows.map((r) => r.categoryId);
}
