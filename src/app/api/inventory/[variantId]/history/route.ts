import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { stockMovements } from '@/drizzle/schema';
import { translateMovementType } from '@/app/admin/inventario/stock-utils';
import { desc, eq } from 'drizzle-orm';

export async function GET(
  _request: NextRequest,
  { params }: { params: { variantId: string } },
) {
  try {
    const variantId = Number(params.variantId);

    if (!Number.isInteger(variantId) || variantId <= 0) {
      return NextResponse.json({ error: 'Variante inválida' }, { status: 400 });
    }

    const movements = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.variantId, variantId))
      .orderBy(desc(stockMovements.createdAt));

    return NextResponse.json({
      movements: movements.map((movement) => ({
        id: movement.id,
        variantId: movement.variantId,
        movementType: movement.movementType,
        movementTypeLabel: translateMovementType(movement.movementType),
        quantity: movement.quantity,
        stockAfter: movement.stockAfter,
        createdAt: movement.createdAt?.toISOString() ?? null,
        createdBy: movement.createdBy,
      })),
    });
  } catch (error) {
    console.error('[GET /api/inventory/[variantId]/history]', error);
    return NextResponse.json({ error: 'Error al obtener historial' }, { status: 500 });
  }
}
