'use server';

import { db } from '@/lib/db';
import { products, productImages, productVariants, variantTypes, variantOptions, productCategories } from '@/drizzle/schema';
import { eq, desc, inArray } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { validateImageUrl } from '@/lib/image-validation';
import { pesosToCents } from '@/lib/products/pricing';
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
  price: number;
  priceOffer?: number;
  priceTransfer?: number;
  discount?: string;
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

  if (data.price < 0 || (data.priceOffer != null && data.priceOffer < 0)) {
    throw new Error('Los precios no pueden ser negativos.');
  }
  if (data.priceOffer != null && data.priceOffer >= data.price) {
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
    price: data.price,
    priceOffer: data.priceOffer || null,
    priceTransfer: data.priceTransfer || null,
    discount: data.discount || null,
    badge: data.badge || null,
    hasFreeShipping: data.hasFreeShipping ?? false,
    isVisible: data.isVisible ?? true,
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
      price: combo.price ?? null,
      priceOffer: combo.priceOffer ?? null,
      imageUrl: combo.imageUrl ?? null,
      optionIds: combo.optionIds.map(String),
      variantTypeId: optionRows.find((option) => option.id === combo.optionIds[0])?.variantTypeId ?? null,
    }));
    await db.insert(productVariants).values(variantRows);
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
  const price = Number.isFinite(priceRaw) ? priceRaw : NaN;
  if (!Number.isFinite(price)) {
    throw new Error('El precio es obligatorio y debe ser un número válido');
  }
  const priceOfferRaw = parseFloat(formData.get('priceOffer') as string);
  const priceOffer = Number.isFinite(priceOfferRaw) ? priceOfferRaw : undefined;
  const priceTransferRaw = parseFloat(formData.get('priceTransfer') as string);
  const priceTransfer = Number.isFinite(priceTransferRaw) ? priceTransferRaw : undefined;
  if (priceOffer !== undefined && priceOffer >= price) {
    throw new Error('La oferta general debe ser menor que el precio regular.');
  }
  const discount = (formData.get('discount') as string) || undefined;
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
    price: pesosToCents(price)!,
    priceOffer: priceOffer !== undefined ? Math.round(priceOffer * 100) : null,
    priceTransfer: priceTransfer !== undefined ? Math.round(priceTransfer * 100) : null,
    discount: discount || null,
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
export async function createVariantType(name: string, optionValues: string[]) {
  // C4-TRACE: Phase 1 — admin-only mutation.
  await requireAdmin();

  // Create the variant type
  const [vt] = await db.insert(variantTypes).values({ name }).returning();

  // Create all options
  if (optionValues.length > 0) {
    const optionRows = optionValues.map((value) => ({
      variantTypeId: vt.id,
      value: value.trim(),
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
  // Delete all existing variants for this product
  await db.delete(productVariants).where(eq(productVariants.productId, productId));

  // Insert all variants (replaced atomically)
  if (variants.length > 0) {
    const optionIds = Array.from(new Set(variants.flatMap((variant) => variant.optionIds)));
    const optionRows = optionIds.length
      ? await db.select({ id: variantOptions.id, value: variantOptions.value, variantTypeId: variantOptions.variantTypeId }).from(variantOptions).where(inArray(variantOptions.id, optionIds))
      : [];
    const rows = variants.map((v) => ({
      productId,
      name: v.optionIds.map((optionId) => optionRows.find((option) => option.id === optionId)?.value ?? String(optionId)).join(' / '),
      stock: v.stock,
      price: v.price ?? null,
      priceOffer: v.priceOffer ?? null,
      imageUrl: v.imageUrl || null,
      variantTypeId: optionRows.find((option) => option.id === v.optionIds[0])?.variantTypeId ?? null,
      optionIds: v.optionIds.map(String),
      isVisible: v.isVisible,
    }));
    await db.insert(productVariants).values(rows);
  }

  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/admin/productos');
}

export async function updateProductVariantImages(productId: number, images: { optionIds: number[]; imageUrl: string | null }[]) {
  // C4-TRACE: Phase 1 — admin-only mutation.
  await requireAdmin();

  const variants = await db.select().from(productVariants).where(eq(productVariants.productId, productId));
  for (const variant of variants) {
    const match = images.find((item) => {
      const current = (variant.optionIds ?? []).map(Number).sort((a, b) => a - b);
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

export async function getProductCategories(productId: number): Promise<number[]> {
  const rows = await db
    .select({ categoryId: productCategories.categoryId })
    .from(productCategories)
    .where(eq(productCategories.productId, productId));
  return rows.map((r) => r.categoryId);
}
