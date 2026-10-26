'use server';

import { db } from '@/lib/db';
import { variantOptions, variantTypes } from '@/drizzle/schema';
import { asc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth';

export type VariantPresentation = 'text' | 'color' | 'image';

export type ManagedVariantOption = {
  id: number;
  variantTypeId: number;
  value: string;
  colorHex: string | null;
  imageUrl: string | null;
  isActive: boolean;
  position: number;
};

export type ManagedVariantType = {
  id: number;
  name: string;
  kind: string;
  presentation: VariantPresentation;
  isActive: boolean;
  position: number;
  options: ManagedVariantOption[];
};

const PRESENTATIONS: VariantPresentation[] = ['text', 'color', 'image'];

function cleanName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function validatePresentation(value: string): asserts value is VariantPresentation {
  if (!PRESENTATIONS.includes(value as VariantPresentation)) throw new Error('Presentación inválida.');
}

function validateHex(value: string | null | undefined) {
  if (value && !/^#[0-9A-Fa-f]{6}$/.test(value)) throw new Error('El color debe estar en formato HEX, por ejemplo #0059D5.');
  return value || null;
}

export async function getManagedVariantTypes(): Promise<ManagedVariantType[]> {
  await requireAdmin();
  const [types, options] = await Promise.all([
    db.select().from(variantTypes).orderBy(asc(variantTypes.position), asc(variantTypes.id)),
    db.select().from(variantOptions).orderBy(asc(variantOptions.position), asc(variantOptions.id)),
  ]);
  return types.map((type) => ({
    ...type,
    position: type.position ?? 0,
    presentation: (PRESENTATIONS.includes(type.presentation as VariantPresentation) ? type.presentation : 'text') as VariantPresentation,
    options: options.filter((option) => option.variantTypeId === type.id).map((option) => ({
      ...option,
      position: option.position ?? 0,
    })),
  }));
}

export async function createManagedVariantType(input: { name: string; presentation: VariantPresentation; kind?: 'system' | 'custom' }) {
  await requireAdmin();
  const name = cleanName(input.name);
  validatePresentation(input.presentation);
  if (!name) throw new Error('Ingresá un nombre para la propiedad.');
  const existing = await db.select({ id: variantTypes.id }).from(variantTypes);
  const currentTypes = await db.select({ name: variantTypes.name }).from(variantTypes);
  if (currentTypes.some((type) => type.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) {
    throw new Error('Ya existe una propiedad con ese nombre.');
  }
  const [created] = await db.insert(variantTypes).values({
    name,
    kind: input.kind || 'custom',
    presentation: input.presentation,
    isActive: true,
    position: existing.length,
  }).returning();
  revalidatePath('/admin/variaciones');
  return created;
}

export async function updateManagedVariantType(id: number, input: { name: string; presentation: VariantPresentation }) {
  await requireAdmin();
  const name = cleanName(input.name);
  validatePresentation(input.presentation);
  if (!name) throw new Error('Ingresá un nombre para la propiedad.');
  const currentTypes = await db.select({ id: variantTypes.id, name: variantTypes.name }).from(variantTypes);
  if (currentTypes.some((type) => type.id !== id && type.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase())) {
    throw new Error('Ya existe otra propiedad con ese nombre.');
  }
  await db.update(variantTypes).set({ name, presentation: input.presentation }).where(eq(variantTypes.id, id));
  revalidatePath('/admin/variaciones');
}

export async function toggleManagedVariantType(id: number, isActive: boolean) {
  await requireAdmin();
  await db.update(variantTypes).set({ isActive }).where(eq(variantTypes.id, id));
  revalidatePath('/admin/variaciones');
}

export async function createManagedVariantOption(input: { variantTypeId: number; value: string; colorHex?: string; imageUrl?: string }) {
  await requireAdmin();
  const value = cleanName(input.value);
  if (!value) throw new Error('Ingresá un valor.');
  const options = await db.select({ value: variantOptions.value }).from(variantOptions).where(eq(variantOptions.variantTypeId, input.variantTypeId));
  if (options.some((option) => option.value.trim().toLocaleLowerCase() === value.toLocaleLowerCase())) {
    throw new Error('Ya existe ese valor en la propiedad.');
  }
  const position = options.length;
  const [created] = await db.insert(variantOptions).values({
    variantTypeId: input.variantTypeId,
    value,
    colorHex: validateHex(input.colorHex),
    imageUrl: input.imageUrl?.trim() || null,
    isActive: true,
    position,
  }).returning();
  revalidatePath('/admin/variaciones');
  return created;
}

export async function updateManagedVariantOption(id: number, input: { value: string; colorHex?: string; imageUrl?: string }) {
  await requireAdmin();
  const value = cleanName(input.value);
  if (!value) throw new Error('Ingresá un valor.');
  const [current] = await db.select().from(variantOptions).where(eq(variantOptions.id, id));
  if (!current) throw new Error('Valor no encontrado.');
  const options = await db.select({ id: variantOptions.id, value: variantOptions.value }).from(variantOptions).where(eq(variantOptions.variantTypeId, current.variantTypeId));
  if (options.some((option) => option.id !== id && option.value.trim().toLocaleLowerCase() === value.toLocaleLowerCase())) {
    throw new Error('Ya existe ese valor en la propiedad.');
  }
  await db.update(variantOptions).set({ value, colorHex: validateHex(input.colorHex), imageUrl: input.imageUrl?.trim() || null }).where(eq(variantOptions.id, id));
  revalidatePath('/admin/variaciones');
}

export async function toggleManagedVariantOption(id: number, isActive: boolean) {
  await requireAdmin();
  await db.update(variantOptions).set({ isActive }).where(eq(variantOptions.id, id));
  revalidatePath('/admin/variaciones');
}
