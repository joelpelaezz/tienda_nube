'use server';

import { db } from '@/lib/db';
import { products, productImages, productVariants, variantTypes, variantOptions, productCategories } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { validateImageUrl } from '@/lib/image-validation';

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
}

export interface CreateProductInput {
  name: string;
  description?: string;
  price: number;
  priceOffer?: number;
  priceTransfer?: number;
  discount?: string;
  badge?: string;
  categoryId?: number;
  isVisible?: boolean;
  imageUrl?: string;
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

  const [product] = await db.insert(products).values({
    name: data.name,
    slug,
    description: data.description || null,
    price: data.price,
    priceOffer: data.priceOffer || null,
    priceTransfer: data.priceTransfer || null,
    discount: data.discount || null,
    badge: data.badge || null,
    categoryId: data.categoryId || null,
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
  if (data.imageUrl) {
    const validation = validateImageUrl(data.imageUrl);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }
    await db.insert(productImages).values({
      productId: product.id,
      url: data.imageUrl,
      alt: data.name,
      position: 0,
    });
  }

  // Create variants from combinations
  if (data.variantCombinations && data.variantCombinations.length > 0) {
    const variantRows = data.variantCombinations.map((combo) => ({
      productId: product.id,
      name: combo.optionIds.map(String).join(' / '), // "Rojo / M"
      stock: combo.stock,
      price: combo.price ?? data.price,
      optionIds: combo.optionIds.map(String),
    }));
    await db.insert(productVariants).values(variantRows);
  }

  revalidatePath('/admin/productos');
  return product;
}

export async function submitProductEdit(id: number, formData: FormData) {
  const name = formData.get('name') as string;
  const description = (formData.get('description') as string) || undefined;
  const price = parseFloat(formData.get('price') as string);
  const priceOffer = parseFloat(formData.get('priceOffer') as string) || undefined;
  const priceTransfer = parseFloat(formData.get('priceTransfer') as string) || undefined;
  const discount = (formData.get('discount') as string) || undefined;
  const badge = (formData.get('badge') as string) || undefined;
  const categoryId = parseInt(formData.get('categoryId') as string) || undefined;
  const isVisible = formData.get('isVisible') === 'true';
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
    price: Math.round(price * 100),
    priceOffer: priceOffer ? Math.round(priceOffer * 100) : null,
    priceTransfer: priceTransfer ? Math.round(priceTransfer * 100) : null,
    discount: discount || null,
    badge: badge || null,
    categoryId: categoryId || null,
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
  categoryId?: number;
  isVisible?: boolean;
}) {
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
  // Delete variants first
  await db.delete(productVariants).where(eq(productVariants.productId, id));
  // Delete images
  await db.delete(productImages).where(eq(productImages.productId, id));
  // Delete product
  await db.delete(products).where(eq(products.id, id));

  revalidatePath('/admin/productos');
}

export async function addProductImage(productId: number, url: string, alt?: string, src: 'url' | 'file' = 'url') {
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
  await db.delete(productImages).where(eq(productImages.id, imageId));
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/admin/productos');
}

export async function uploadProductImage(productId: number, url: string, src: 'url' | 'file' = 'url', alt?: string) {
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

export async function setImagePosition(productId: number, imagePositions: { id: number; position: number }[]) {
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
  await db.delete(productImages).where(eq(productImages.id, imageIds[0]));
  if (imageIds.length > 1) {
    for (let i = 1; i < imageIds.length; i++) {
      await db.delete(productImages).where(eq(productImages.id, imageIds[i]));
    }
  }
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/admin/productos');
}

// ─────────────────────────────────────────────────────────────
// Variant Types
// ─────────────────────────────────────────────────────────────
export async function createVariantType(name: string, optionValues: string[]) {
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
  price: number;      // in cents
  isVisible: boolean;
}

export async function saveProductVariants(productId: number, variants: SaveVariantInput[]) {
  // Delete all existing variants for this product
  await db.delete(productVariants).where(eq(productVariants.productId, productId));

  // Insert all variants (replaced atomically)
  if (variants.length > 0) {
    const rows = variants.map((v) => ({
      productId,
      name: v.optionIds.join(' / '),
      stock: v.stock,
      price: v.price,
      optionIds: v.optionIds.map(String),
      isVisible: v.isVisible,
    }));
    await db.insert(productVariants).values(rows);
  }

  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/admin/productos');
}

export async function deleteProductVariant(variantId: number, productId: number) {
  await db.delete(productVariants).where(eq(productVariants.id, variantId));
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/admin/productos');
}

export async function updateProductCategories(productId: number, categoryIds: number[]) {
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
