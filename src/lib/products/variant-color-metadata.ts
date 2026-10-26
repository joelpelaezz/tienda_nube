import { and, asc, eq, inArray, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { productVariantOptions, variantOptions, variantTypes } from '@/drizzle/schema';

export interface VariantColorMetadata {
  name: string;
  colorHex: string | null;
}

/** Finds the actual color option for each variant, independent of option order. */
export async function getVariantColorMetadata(variantIds: number[]): Promise<Map<number, VariantColorMetadata>> {
  const uniqueVariantIds = Array.from(new Set(variantIds));
  if (uniqueVariantIds.length === 0) return new Map();

  const rows = await db
    .select({
      productVariantId: productVariantOptions.productVariantId,
      value: variantOptions.value,
      colorHex: variantOptions.colorHex,
      position: productVariantOptions.position,
    })
    .from(productVariantOptions)
    .innerJoin(variantOptions, eq(productVariantOptions.variantOptionId, variantOptions.id))
    .innerJoin(variantTypes, eq(variantOptions.variantTypeId, variantTypes.id))
    .where(and(
      inArray(productVariantOptions.productVariantId, uniqueVariantIds),
      or(
        eq(variantTypes.presentation, 'color'),
        sql`lower(${variantTypes.name}) in ('color', 'colour')`,
      ),
    ))
    .orderBy(asc(productVariantOptions.position));

  const metadata = new Map<number, VariantColorMetadata>();
  for (const row of rows) {
    if (!metadata.has(row.productVariantId)) {
      metadata.set(row.productVariantId, { name: row.value, colorHex: row.colorHex });
    }
  }
  return metadata;
}
