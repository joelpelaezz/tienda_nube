import { beforeEach, describe, expect, it, vi } from 'vitest';

const { db, requireAdmin, revalidatePath } = vi.hoisted(() => ({
  db: { transaction: vi.fn() },
  requireAdmin: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/db', () => ({ db }));
vi.mock('@/lib/auth', () => ({ requireAdmin }));
vi.mock('next/cache', () => ({ revalidatePath }));

import { updateProductStock, updateVariantStock } from './actions';

function makeTx(selectRows: unknown[][]) {
  const select = vi.fn();
  for (const rows of selectRows) {
    const query = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      for: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(rows),
    };
    select.mockReturnValueOnce(query);
  }
  const insertedMovement = { id: 71, createdAt: new Date('2026-01-01T00:00:00Z') };
  const returning = vi.fn().mockResolvedValue([insertedMovement]);
  const values = vi.fn().mockReturnValue({ returning });
  const insert = vi.fn().mockReturnValue({ values });
  const set = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
  const update = vi.fn().mockReturnValue({ set });
  return { tx: { select, insert, update }, select, insert, values, update, set, insertedMovement };
}

describe('inventory stock adjustments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ userId: '42', role: 'admin' });
  });

  it('locks variant stock, validates current reservations, and attributes movement to the authenticated admin', async () => {
    const mock = makeTx([[{ id: 7, stock: 10, reservedStock: 4, productId: 3 }], [{ productType: 'physical' }]]);
    db.transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback(mock.tx));

    const result = await updateVariantStock(7, 9, 999);

    expect(mock.select.mock.results[0].value.for).toHaveBeenCalledWith('update');
    expect(mock.insert).toHaveBeenCalled();
    expect(mock.values).toHaveBeenCalledWith(expect.objectContaining({ quantity: -1, stockAfter: 9, createdBy: 42 }));
    expect(result.success).toBe(true);
  });

  it('rejects a stock adjustment below reservations read under the row lock', async () => {
    const mock = makeTx([[{ id: 7, stock: 10, reservedStock: 5, productId: 3 }], [{ productType: 'physical' }]]);
    db.transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback(mock.tx));

    await expect(updateVariantStock(7, 4)).rejects.toThrow('hay 5 unidades reservadas');
    expect(mock.update).not.toHaveBeenCalled();
    expect(mock.insert).not.toHaveBeenCalled();
  });

  it('locks product stock and records movement from that same reserved-stock snapshot', async () => {
    const mock = makeTx([[{ id: 12, stock: 20, reservedStock: 6, productType: 'physical' }], []]);
    db.transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback(mock.tx));

    await updateProductStock(12, 18, 999);

    expect(mock.select.mock.results[0].value.for).toHaveBeenCalledWith('update');
    expect(mock.values).toHaveBeenCalledWith(expect.objectContaining({ quantity: -2, stockAfter: 18, createdBy: 42 }));
  });

  it('does not allow physical inventory adjustments for digital products', async () => {
    const mock = makeTx([[{ id: 12, stock: 20, reservedStock: 0, productType: 'digital' }]]);
    db.transaction.mockImplementation((callback: (tx: unknown) => unknown) => callback(mock.tx));

    await expect(updateProductStock(12, 18)).rejects.toThrow('Producto físico no encontrado');
    expect(mock.update).not.toHaveBeenCalled();
    expect(mock.insert).not.toHaveBeenCalled();
  });
});
