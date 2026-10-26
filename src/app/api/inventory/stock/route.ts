import { NextRequest, NextResponse } from 'next/server';
import { updateVariantStock } from '@/app/admin/inventario/actions';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const variantId = Number(body.variantId);
    const newStock = Number(body.newStock);

    if (!Number.isInteger(variantId) || variantId <= 0) {
      return NextResponse.json({ error: 'Variante inválida' }, { status: 400 });
    }

    if (!Number.isInteger(newStock) || newStock < 0) {
      return NextResponse.json({ error: 'El stock debe ser un entero mayor o igual a 0' }, { status: 400 });
    }

    const result = await updateVariantStock(variantId, newStock);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[POST /api/inventory/stock]', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Error al actualizar stock' }, { status: 500 });
  }
}
