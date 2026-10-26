'use server';

import { db } from '@/lib/db';
import { productImages, products, productVariants, productVariantOptions, productStockMovements, stockMovements, variantOptions } from '@/drizzle/schema';
import { and, asc, desc, eq, ilike, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';
import type { InventoryProduct, InventoryVariant, InventoryResult, InventoryStatusFilter } from './types';

const DEFAULT_PAGE = 1;
const PER_PAGE = 20;
const LOW_STOCK_THRESHOLD = 5;

function normalizePage(page?: number) {
  if (!page || Number.isNaN(page) || page < 1) return DEFAULT_PAGE;
  return Math.floor(page);
}

function normalizeStatus(status?: string): InventoryStatusFilter {
  return status === 'bajo' || status === 'sin' ? status : 'todos';
}

function statusCondition(status: InventoryStatusFilter) {
  if (status === 'bajo') {
    return sql`coalesce(${products.productType}, 'physical') <> 'digital' and (
      exists (
        select 1 from product_variants pv
        where pv.product_id = ${products.id}
          and (coalesce(pv.stock, 0) - coalesce(pv.reserved_stock, 0)) between 1 and ${LOW_STOCK_THRESHOLD}
      ) or (
        not exists (select 1 from product_variants pv where pv.product_id = ${products.id})
        and (coalesce(${products.stock}, 0) - coalesce(${products.reservedStock}, 0)) between 1 and ${LOW_STOCK_THRESHOLD}
      )
    )`;
  }

  if (status === 'sin') {
    return sql`coalesce(${products.productType}, 'physical') <> 'digital' and (
      exists (
        select 1 from product_variants pv
        where pv.product_id = ${products.id}
          and (coalesce(pv.stock, 0) - coalesce(pv.reserved_stock, 0)) <= 0
      ) or (
        not exists (select 1 from product_variants pv where pv.product_id = ${products.id})
        and (coalesce(${products.stock}, 0) - coalesce(${products.reservedStock}, 0)) <= 0
      )
    )`;
  }

  return undefined;
}

function buildWhere(search?: string, status?: string) {
  const conditions = [];
  const cleanSearch = search?.trim();
  const normalizedStatus = normalizeStatus(status);

  if (cleanSearch) {
    conditions.push(ilike(products.name, `%${cleanSearch}%`));
  }

  const stockCondition = statusCondition(normalizedStatus);
  if (stockCondition) {
    conditions.push(stockCondition);
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

function mapInventoryProducts(
  productRows: Awaited<ReturnType<typeof getProductRows>>,
  imageRows: Awaited<ReturnType<typeof getImageRows>>,
  variantRows: Awaited<ReturnType<typeof getVariantRows>>,
): InventoryProduct[] {
  const imageByProduct = new Map<number, { url: string; alt: string | null }>();
  for (const image of imageRows) {
    if (!imageByProduct.has(image.productId)) {
      imageByProduct.set(image.productId, { url: image.url, alt: image.alt });
    }
  }

  const variantsByProduct = new Map<number, InventoryVariant[]>();
  for (const variant of variantRows) {
    const list = variantsByProduct.get(variant.productId) ?? [];
    list.push({
      id: variant.id,
      name: variant.name,
      stock: variant.stock,
      reservedStock: variant.reservedStock,
      availableStock: variant.availableStock,
      sku: variant.sku,
      isVisible: variant.isVisible,
    });
    variantsByProduct.set(variant.productId, list);
  }

  return productRows.map((product) => {
    const image = imageByProduct.get(product.id);
    return {
      ...product,
      imageUrl: image?.url ?? null,
      imageAlt: image?.alt ?? null,
      variants: variantsByProduct.get(product.id) ?? [],
    };
  });
}

async function getProductRows(whereClause: ReturnType<typeof buildWhere>, perPage: number, offset: number) {
  return db
    .select({
      id: products.id,
      name: products.name,
      slug: products.slug,
      sku: products.sku,
      isVisible: products.isVisible,
      productType: products.productType,
      stock: sql<number | null>`case when coalesce(${products.productType}, 'physical') = 'digital' then null else coalesce(${products.stock}, 0) end`,
      reservedStock: sql<number>`case when coalesce(${products.productType}, 'physical') = 'digital' then 0 else coalesce(${products.reservedStock}, 0) end`,
      availableStock: sql<number | null>`case when coalesce(${products.productType}, 'physical') = 'digital' then null else greatest(0, coalesce(${products.stock}, 0) - coalesce(${products.reservedStock}, 0)) end`,
    })
    .from(products)
    .where(whereClause)
    .orderBy(desc(products.createdAt), asc(products.name))
    .limit(perPage)
    .offset(offset);
}

async function getImageRows(productIds: number[]) {
  if (productIds.length === 0) return [];

  return db
    .select({
      productId: productImages.productId,
      url: productImages.url,
      alt: productImages.alt,
      position: productImages.position,
    })
    .from(productImages)
    .where(inArray(productImages.productId, productIds))
    .orderBy(asc(productImages.position));
}

async function getVariantRows(productIds: number[]) {
  if (productIds.length === 0) return [];

  const variants = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      name: productVariants.name,
      stock: sql<number>`coalesce(${productVariants.stock}, 0)`,
      reservedStock: sql<number>`coalesce(${productVariants.reservedStock}, 0)`,
      sku: productVariants.sku,
      isVisible: productVariants.isVisible,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(and(
      inArray(productVariants.productId, productIds),
      sql`coalesce(${products.productType}, 'physical') <> 'digital'`,
    ))
    .orderBy(asc(productVariants.id));

  if (variants.length === 0) return [];

  const relations = await db
    .select()
    .from(productVariantOptions)
    .where(inArray(productVariantOptions.productVariantId, variants.map((variant) => variant.id)));
  const allOptionIds = Array.from(new Set(relations.map((relation) => relation.variantOptionId)));

  const options = allOptionIds.length
    ? await db
        .select({ id: variantOptions.id, value: variantOptions.value })
        .from(variantOptions)
        .where(inArray(variantOptions.id, allOptionIds))
    : [];

  const optionMap = new Map(options.map((option) => [option.id, option.value]));

  return variants.map((variant) => {
    const optionNames = relations
      .filter((relation) => relation.productVariantId === variant.id)
      .sort((a, b) => a.position - b.position)
      .map((relation) => optionMap.get(relation.variantOptionId) ?? String(relation.variantOptionId))
      .join(' / ');

    const stock = variant.stock ?? 0;
    const reserved = variant.reservedStock ?? 0;

    return {
      id: variant.id,
      productId: variant.productId,
      name: optionNames || variant.name,
      stock,
      reservedStock: reserved,
      availableStock: Math.max(0, stock - reserved),
      sku: variant.sku,
      isVisible: variant.isVisible,
    };
  });
}

async function getStats() {
  const [[variantStats], [productStats]] = await Promise.all([
    db
    .select({
      totalStock: sql<number>`coalesce(sum(coalesce(${productVariants.stock}, 0)), 0)::int`,
      totalAvailable: sql<number>`coalesce(sum(greatest(0, coalesce(${productVariants.stock}, 0) - coalesce(${productVariants.reservedStock}, 0))), 0)::int`,
      lowStock: sql<number>`count(*) filter (where (coalesce(${productVariants.stock}, 0) - coalesce(${productVariants.reservedStock}, 0)) between 1 and ${LOW_STOCK_THRESHOLD})::int`,
      outOfStock: sql<number>`count(*) filter (where (coalesce(${productVariants.stock}, 0) - coalesce(${productVariants.reservedStock}, 0)) <= 0)::int`,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(sql`coalesce(${products.productType}, 'physical') <> 'digital'`),
    db
      .select({
        totalStock: sql<number>`coalesce(sum(coalesce(${products.stock}, 0)), 0)::int`,
        totalAvailable: sql<number>`coalesce(sum(greatest(0, coalesce(${products.stock}, 0) - coalesce(${products.reservedStock}, 0))), 0)::int`,
        lowStock: sql<number>`count(*) filter (where (coalesce(${products.stock}, 0) - coalesce(${products.reservedStock}, 0)) between 1 and ${LOW_STOCK_THRESHOLD})::int`,
        outOfStock: sql<number>`count(*) filter (where (coalesce(${products.stock}, 0) - coalesce(${products.reservedStock}, 0)) <= 0)::int`,
      })
      .from(products)
      .where(and(
        sql`coalesce(${products.productType}, 'physical') <> 'digital'`,
        sql`not exists (select 1 from product_variants pv where pv.product_id = ${products.id})`,
      )),
  ]);

  return {
    totalStock: (variantStats?.totalStock ?? 0) + (productStats?.totalStock ?? 0),
    totalAvailable: (variantStats?.totalAvailable ?? 0) + (productStats?.totalAvailable ?? 0),
    lowStock: (variantStats?.lowStock ?? 0) + (productStats?.lowStock ?? 0),
    outOfStock: (variantStats?.outOfStock ?? 0) + (productStats?.outOfStock ?? 0),
  };
}

export async function getInventoryProducts(options: {
  page?: number;
  search?: string;
  status?: InventoryStatusFilter;
} = {}): Promise<InventoryResult> {
  const page = normalizePage(options.page);
  const perPage = PER_PAGE;
  const offset = (page - 1) * perPage;
  const whereClause = buildWhere(options.search, options.status);

  const [productRows, countRow, stats] = await Promise.all([
    getProductRows(whereClause, perPage, offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(whereClause)
      .then((rows) => rows[0]),
    getStats(),
  ]);

  const productIds = productRows.map((product) => product.id);
  const [imageRows, variantRows] = await Promise.all([
    getImageRows(productIds),
    getVariantRows(productIds),
  ]);

  const total = countRow?.count ?? 0;

  return {
    products: mapInventoryProducts(productRows, imageRows, variantRows),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    stats,
  };
}

export async function updateVariantStock(variantId: number, newStock: number, userId?: number) {
  await requireAdmin();
  if (!Number.isInteger(variantId) || variantId <= 0) {
    throw new Error('Variante inválida');
  }

  if (!Number.isInteger(newStock) || newStock < 0) {
    throw new Error('El stock debe ser un número entero mayor o igual a 0');
  }

  const [variant] = await db
    .select({ id: productVariants.id, stock: productVariants.stock, reservedStock: productVariants.reservedStock })
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);

  if (!variant) {
    throw new Error('Variante no encontrada');
  }

  // Prevent setting stock below reserved amount
  const reserved = variant.reservedStock ?? 0;
  if (newStock < reserved) {
    throw new Error(
      `No se puede dejar el stock en ${newStock}: hay ${reserved} unidades reservadas por órdenes pending. Liberá esas órdenes primero o usá un valor >= ${reserved}.`
    );
  }

  const currentStock = variant.stock ?? 0;
  const quantity = newStock - currentStock;

  if (quantity === 0) {
    return { success: true, movement: null, unchanged: true };
  }

  const [movement] = await db.transaction(async (tx) => {
    await tx
      .update(productVariants)
      .set({ stock: newStock })
      .where(eq(productVariants.id, variantId));

    return tx
      .insert(stockMovements)
      .values({
        variantId,
        movementType: 'ajuste',
        quantity,
        stockAfter: newStock,
        createdBy: userId ?? null,
      })
      .returning();
  });

  revalidatePath('/admin/inventario');
  revalidatePath('/admin/productos');
  revalidatePath('/');
  revalidatePath('/productos');
  revalidatePath('/productos/[slug]', 'page');

  return {
    success: true,
    movement: movement
      ? {
          ...movement,
          createdAt: movement.createdAt?.toISOString() ?? null,
        }
      : null,
    unchanged: false,
  };
}

export async function updateProductStock(productId: number, newStock: number, userId?: number) {
  await requireAdmin();
  if (!Number.isInteger(productId) || productId <= 0) throw new Error('Producto inválido');
  if (!Number.isInteger(newStock) || newStock < 0) {
    throw new Error('El stock debe ser un número entero mayor o igual a 0');
  }

  const [product] = await db
    .select({ id: products.id, stock: products.stock, reservedStock: products.reservedStock, productType: products.productType })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!product || product.productType === 'digital') throw new Error('Producto físico no encontrado');

  const [variant] = await db.select({ id: productVariants.id }).from(productVariants).where(eq(productVariants.productId, productId)).limit(1);
  if (variant) throw new Error('Este producto controla stock por variante');

  const reserved = product.reservedStock ?? 0;
  if (newStock < reserved) {
    throw new Error(`No se puede dejar el stock en ${newStock}: hay ${reserved} unidades reservadas.`);
  }

  const currentStock = product.stock ?? 0;
  const quantity = newStock - currentStock;
  if (quantity === 0) return { success: true, movement: null, unchanged: true };

  const [movement] = await db.transaction(async (tx) => {
    await tx.update(products).set({ stock: newStock }).where(eq(products.id, productId));
    return tx.insert(productStockMovements).values({
      productId,
      movementType: 'ajuste',
      quantity,
      stockAfter: newStock,
      createdBy: userId ?? null,
    }).returning();
  });

  revalidatePath('/admin/inventario');
  revalidatePath('/admin/productos');
  revalidatePath(`/admin/productos/${productId}`);
  revalidatePath('/');
  revalidatePath('/productos');
  revalidatePath('/productos/[slug]', 'page');
  return {
    success: true,
    movement: movement ? { ...movement, createdAt: movement.createdAt?.toISOString() ?? null } : null,
    unchanged: false,
  };
}
