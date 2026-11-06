import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/db', () => ({
  db: {
    query: { categories: { findFirst: vi.fn() } },
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
}));

import { auth } from '@/auth';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { createCategory, deleteCategory, moveCategory, updateCategory } from './actions';

const form = () => {
  const data = new FormData();
  data.set('name', 'Category');
  data.set('slug', 'category');
  return data;
};

const actions = [
  ['create', () => createCategory(form())],
  ['update', () => updateCategory(1, form())],
  ['delete', () => deleteCategory(1)],
  ['move', () => moveCategory(1, null)],
] as const;

describe('category mutation authorization', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(db.query.categories.findFirst).mockResolvedValue(undefined);
    vi.mocked(db.insert).mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) } as never);
    vi.mocked(db.update).mockReturnValue({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) } as never);
    vi.mocked(db.delete).mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) } as never);
    vi.mocked(db.select)
      .mockReturnValueOnce({ from: vi.fn().mockResolvedValue([]) } as never)
      .mockReturnValueOnce({ from: vi.fn(() => ({ where: vi.fn(() => ({ orderBy: vi.fn().mockResolvedValue([]) })) })) } as never);
    vi.mocked(db.transaction).mockImplementation((async (callback: (tx: typeof db) => Promise<unknown>) => callback(db)) as never);
  });

  for (const [name, invoke] of actions) {
    it(`${name} denies anonymous and customer sessions before database access and allows admins`, async () => {
      for (const [role, status] of [['anonymous', 401], ['customer', 403]] as const) {
        vi.mocked(auth).mockResolvedValue((role === 'anonymous' ? null : { user: { id: '1', role } }) as never);
        await expect(invoke()).rejects.toMatchObject({ status });
        expect(db.query.categories.findFirst).not.toHaveBeenCalled();
        expect(db.select).not.toHaveBeenCalled();
        expect(db.insert).not.toHaveBeenCalled();
        expect(db.update).not.toHaveBeenCalled();
        expect(db.delete).not.toHaveBeenCalled();
        expect(db.transaction).not.toHaveBeenCalled();
        expect(revalidatePath).not.toHaveBeenCalled();
      }

      vi.mocked(auth).mockResolvedValue({ user: { id: '1', role: 'admin' } } as never);
      await expect(invoke()).resolves.toBeUndefined();
      if (name === 'create') expect(db.insert).toHaveBeenCalled();
      if (name === 'update') expect(db.update).toHaveBeenCalled();
      if (name === 'delete') expect(db.delete).toHaveBeenCalled();
      if (name === 'move') expect(db.transaction).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/admin/categorias');
    });
  }
});
