import { NextRequest, NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { productStockMovements } from '@/drizzle/schema';
import { translateMovementType } from '@/app/admin/inventario/stock-utils';

export async function GET(request: NextRequest) {
  try {
    const productId = Number(new URL(request.url).searchParams.get('productId'));
    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json({ error: 'Producto inválido' }, { status: 400 });
    }

    const movements = await db
      .select()
      .from(productStockMovements)
      .where(eq(productStockMovements.productId, productId))
      .orderBy(desc(productStockMovements.createdAt));

    return NextResponse.json({
      movements: movements.map((movement) => ({
        id: movement.id,
        productId: movement.productId,
        movementType: movement.movementType,
        movementTypeLabel: translateMovementType(movement.movementType),
        quantity: movement.quantity,
        stockAfter: movement.stockAfter,
        createdAt: movement.createdAt?.toISOString() ?? null,
        createdBy: movement.createdBy,
      })),
    });
  } catch (error) {
    console.error('[GET /api/inventory/product-history]', error);
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 });
  }
}
