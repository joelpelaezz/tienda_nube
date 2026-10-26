'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { categories } from '@/drizzle/schema';
import { asc, eq, isNull } from 'drizzle-orm';

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export async function createCategory(formData: FormData) {
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string || generateSlug(name);
  const parentId = formData.get('parentId') as string;

  if (!name?.trim()) {
    return { error: 'El nombre es obligatorio.' };
  }

  // Check slug uniqueness
  const existing = await db.query.categories.findFirst({
    where: eq(categories.slug, slug),
  });
  if (existing) {
    return { error: 'Ya existe una categoría con ese slug.' };
  }

  await db.insert(categories).values({
    name: name.trim(),
    slug,
    parentId: parentId ? parseInt(parentId) : null,
    position: 0,
  });

  revalidatePath('/admin/categorias');
}

export async function updateCategory(id: number, formData: FormData) {
  const name = formData.get('name') as string;
  const slug = formData.get('slug') as string;
  const parentId = formData.get('parentId') as string;

  if (!name?.trim()) {
    return { error: 'El nombre es obligatorio.' };
  }

  // Check slug uniqueness (exclude self)
  const existing = await db.query.categories.findFirst({
    where: eq(categories.slug, slug),
  });
  if (existing && existing.id !== id) {
    return { error: 'Ya existe otra categoría con ese slug.' };
  }

  // Prevent setting self as parent
  const parentIdVal = parentId ? parseInt(parentId) : null;
  if (parentIdVal === id) {
    return { error: 'Una categoría no puede ser padre de sí misma.' };
  }

  await db.update(categories)
    .set({
      name: name.trim(),
      slug,
      parentId: parentIdVal,
    })
    .where(eq(categories.id, id));

  revalidatePath('/admin/categorias');
}

export async function deleteCategory(id: number) {
  // Check if category has children
  const children = await db.query.categories.findFirst({
    where: eq(categories.parentId, id),
  });
  if (children) {
    return { error: 'No podés eliminar una categoría que tiene subcategorías. Eliminá las subcategorías primero.' };
  }

  await db.delete(categories).where(eq(categories.id, id));

  revalidatePath('/admin/categorias');
}

export async function moveCategory(id: number, parentId: number | null) {
  if (parentId === id) return { error: 'Una categoría no puede ser padre de sí misma.' };

  const allCategories = await db.select({ id: categories.id, parentId: categories.parentId }).from(categories);
  const descendants = new Set<number>();
  const pending = [id];
  while (pending.length > 0) {
    const current = pending.pop()!;
    for (const category of allCategories) {
      if (category.parentId === current && !descendants.has(category.id)) {
        descendants.add(category.id);
        pending.push(category.id);
      }
    }
  }
  if (parentId !== null && descendants.has(parentId)) {
    return { error: 'No podés mover una categoría dentro de sus propios descendientes.' };
  }

  const siblingRows = await db
    .select({ id: categories.id })
    .from(categories)
    .where(parentId === null ? isNull(categories.parentId) : eq(categories.parentId, parentId))
    .orderBy(asc(categories.position), asc(categories.id));
  const orderedIds = siblingRows.map((row) => row.id).filter((categoryId) => categoryId !== id);
  orderedIds.push(id);

  await db.transaction(async (tx) => {
    await tx.update(categories).set({ parentId }).where(eq(categories.id, id));
    for (let position = 0; position < orderedIds.length; position++) {
      await tx.update(categories).set({ position }).where(eq(categories.id, orderedIds[position]));
    }
  });

  revalidatePath('/admin/categorias');
}
