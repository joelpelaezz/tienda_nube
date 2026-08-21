'use server';

import { db } from '@/lib/db';
import { products, productImages, productVariants } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function createProduct(data: {
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
  variants?: { name: string; stock: number }[];
}) {
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

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
  }).returning();

  // Create initial image if URL provided
  if (data.imageUrl) {
    await db.insert(productImages).values({
      productId: product.id,
      url: data.imageUrl,
      alt: data.name,
      position: 0,
    });
  }

  // Create variants if provided
  if (data.variants && data.variants.length > 0) {
    await db.insert(productVariants).values(
      data.variants.map((v) => ({
        productId: product.id,
        name: v.name,
        stock: v.stock,
        price: data.price,
      }))
    );
  }

  revalidatePath('/admin/productos');
  return product;
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

export async function addProductImage(productId: number, url: string, alt?: string) {
  // Get max position
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
  });

  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/admin/productos');
}

export async function deleteProductImage(imageId: number, productId: number) {
  await db.delete(productImages).where(eq(productImages.id, imageId));
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/admin/productos');
}
