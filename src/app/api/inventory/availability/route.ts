import { NextRequest, NextResponse } from 'next/server';
import { inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { products, productVariants } from '@/drizzle/schema';

export const dynamic = 'force-dynamic';

interface RequestedCartItem {
  productId: number;
  variantId?: number | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { items?: RequestedCartItem[] };
    const items = body.items;
    if (!Array.isArray(items) || items.length > 100 || items.some((item) => (
      !Number.isInteger(item.productId) || item.productId <= 0 ||
      (item.variantId != null && (!Number.isInteger(item.variantId) || item.variantId <= 0))
    ))) {
      return NextResponse.json({ error: 'Lista de productos inválida' }, { status: 400 });
    }

    const productIds = Array.from(new Set(items.map((item) => item.productId)));
    const variantIds = Array.from(new Set(items.flatMap((item) => item.variantId ? [item.variantId] : [])));
    const [productRows, hasVariantRows, variantRows] = await Promise.all([
      productIds.length
        ? db.select({ id: products.id, stock: products.stock, reservedStock: products.reservedStock, productType: products.productType, isVisible: products.isVisible }).from(products).where(inArray(products.id, productIds))
        : Promise.resolve([]),
      productIds.length
        ? db.selectDistinct({ productId: productVariants.productId }).from(productVariants).where(inArray(productVariants.productId, productIds))
        : Promise.resolve([]),
      variantIds.length
        ? db.select({
            id: productVariants.id,
            productId: productVariants.productId,
            stock: productVariants.stock,
            reservedStock: productVariants.reservedStock,
            isVisible: productVariants.isVisible,
          }).from(productVariants).where(inArray(productVariants.id, variantIds))
        : Promise.resolve([]),
    ]);

    const productMap = new Map(productRows.map((product) => [product.id, product]));
    const hasVariantSet = new Set(hasVariantRows.map((row) => row.productId));
    const variantMap = new Map(variantRows.map((variant) => [variant.id, variant]));
    const availability: Record<string, number | null> = {};

    for (const item of items) {
      const key = `${item.productId}:${item.variantId ?? 'base'}`;
      const product = productMap.get(item.productId);
      if (!product || !product.isVisible) {
        availability[key] = 0;
        continue;
      }
      if (product.productType === 'digital') {
        availability[key] = null;
        continue;
      }
      if (item.variantId == null && hasVariantSet.has(item.productId)) {
        availability[key] = 0;
        continue;
      }

      if (item.variantId != null) {
        const variant = variantMap.get(item.variantId);
        availability[key] = !variant || variant.productId !== item.productId || !variant.isVisible
          ? 0
          : Math.max(0, (variant.stock ?? 0) - (variant.reservedStock ?? 0));
        continue;
      }

      const computed = Math.max(0, (product.stock ?? 0) - (product.reservedStock ?? 0));
      availability[key] = computed;
    }

    return NextResponse.json({ availability });
  } catch (error) {
    console.error('[POST /api/inventory/availability]', error);
    return NextResponse.json({ error: 'No se pudo consultar el inventario' }, { status: 500 });
  }
}
