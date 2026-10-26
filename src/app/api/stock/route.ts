import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { productVariants } from '@/drizzle/schema';
import { inArray, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get('variantIds');

    if (!idsParam) {
      return NextResponse.json(
        { error: 'variantIds is required' },
        { status: 400 }
      );
    }

    const ids = idsParam.split(',').map((s) => parseInt(s.trim(), 10));

    if (ids.some(isNaN) || ids.length === 0) {
      return NextResponse.json(
        { error: 'variantIds must be comma-separated integers' },
        { status: 400 }
      );
    }

    const rows = await db
      .select({
        id: productVariants.id,
        stock: sql<number>`greatest(0, coalesce(${productVariants.stock}, 0) - coalesce(${productVariants.reservedStock}, 0))`,
      })
      .from(productVariants)
      .where(inArray(productVariants.id, ids));

    const stockMap: Record<number, number> = {};
    for (const row of rows) {
      stockMap[row.id] = row.stock ?? 0;
    }

    return NextResponse.json(stockMap);
  } catch (error) {
    console.error('[GET /api/stock]', error);
    return NextResponse.json(
      { error: 'Error al consultar stock' },
      { status: 500 }
    );
  }
}
