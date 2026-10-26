import { NextRequest, NextResponse } from 'next/server';
import { getInventoryProducts } from '@/app/admin/inventario/actions';
import type { InventoryStatusFilter } from '@/app/admin/inventario/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get('page') ?? '1');
    const search = searchParams.get('search') ?? '';
    const status = (searchParams.get('status') ?? 'todos') as InventoryStatusFilter;

    const result = await getInventoryProducts({ page, search, status });
    return NextResponse.json(result);
  } catch (error) {
    console.error('[GET /api/inventory]', error);
    return NextResponse.json({ error: 'Error al obtener inventario' }, { status: 500 });
  }
}
