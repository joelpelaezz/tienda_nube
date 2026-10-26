'use server';

import { revalidatePath } from 'next/cache';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { coupons } from '@/drizzle/schema';
import { requireAdmin } from '@/lib/auth';

// C4-TRACE: admin date-only expiration is persisted through the end of its selected UTC day.

/** Coupon rows are money-aware: percent coupons store 0-100, fixed coupons store cents. */
export interface CouponFormValues {
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  minPurchase: number | null;
  maxUses: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  isActive: boolean;
}

function parseCode(raw: FormDataEntryValue | null): string {
  return String(raw ?? '').trim().toUpperCase();
}

function parseType(raw: FormDataEntryValue | null): 'percent' | 'fixed' {
  return raw === 'fixed' ? 'fixed' : 'percent';
}

function parseMoney(raw: FormDataEntryValue | null): number | null {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const parsed = Number(text.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
}

function parsePercent(raw: FormDataEntryValue | null): number {
  return Math.round(Number(String(raw ?? '').replace(',', '.')));
}

function parsePositiveInt(raw: FormDataEntryValue | null): number | null {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function parseDate(raw: FormDataEntryValue | null, endOfDay = false): Date | null {
  const text = String(raw ?? '').trim();
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new Error('Ingresá una fecha válida.');
  }
  const date = new Date(`${text}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== text) {
    throw new Error('Ingresá una fecha válida.');
  }
  return date;
}

function parseCoupon(formData: FormData): CouponFormValues {
  const code = parseCode(formData.get('code'));
  const type = parseType(formData.get('type'));
  const value = type === 'percent' ? parsePercent(formData.get('value')) : moneyToCentsValue(formData.get('value'));
  const minPurchase = parseMoney(formData.get('minPurchase'));
  const maxUses = parsePositiveInt(formData.get('maxUses'));
  const validFrom = parseDate(formData.get('validFrom'));
  const validUntil = parseDate(formData.get('validUntil'), true);
  const isActive = formData.get('isActive') === 'on';

  if (!code) throw new Error('Ingresá un código de cupón.');
  if (type === 'percent' && (value < 1 || value > 100)) {
    throw new Error('El descuento en porcentaje debe estar entre 1 y 100.');
  }
  if (type === 'fixed' && value <= 0) {
    throw new Error('El descuento fijo debe ser mayor a 0.');
  }
  if (validFrom && validUntil && validUntil < validFrom) {
    throw new Error('La fecha de vencimiento no puede ser anterior a la de inicio.');
  }

  return { code, type, value, minPurchase, maxUses, validFrom, validUntil, isActive };
}

function moneyToCentsValue(raw: FormDataEntryValue | null): number {
  const text = String(raw ?? '').trim();
  if (!text) return 0;
  const parsed = Number(text.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : 0;
}

export async function getCoupons() {
  await requireAdmin();
  return db.select().from(coupons).orderBy(asc(coupons.code));
}

export async function createCoupon(formData: FormData) {
  await requireAdmin();
  const values = parseCoupon(formData);

  const inserted = await db
    .insert(coupons)
    .values({
      code: values.code,
      type: values.type,
      value: values.value,
      minPurchase: values.minPurchase,
      maxUses: values.maxUses,
      usedCount: 0,
      validFrom: values.validFrom,
      validUntil: values.validUntil,
      isActive: values.isActive,
    })
    .onConflictDoNothing({ target: coupons.code })
    .returning({ id: coupons.id });

  if (inserted.length === 0) {
    throw new Error(`El código ${values.code} ya existe.`);
  }

  revalidatePath('/admin/descuentos');
  revalidatePath('/checkout');
  return inserted[0].id;
}

export async function updateCoupon(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id) || id <= 0) throw new Error('Cupón inválido.');

  const values = parseCoupon(formData);

  const updated = await db
    .update(coupons)
    .set({
      code: values.code,
      type: values.type,
      value: values.value,
      minPurchase: values.minPurchase,
      maxUses: values.maxUses,
      validFrom: values.validFrom,
      validUntil: values.validUntil,
      isActive: values.isActive,
    })
    .where(eq(coupons.id, id))
    .returning({ id: coupons.id });

  if (updated.length === 0) throw new Error('No encontramos el cupón.');

  revalidatePath('/admin/descuentos');
  revalidatePath('/checkout');
}

export async function toggleCoupon(id: number, isActive: boolean) {
  await requireAdmin();
  if (!Number.isInteger(id) || id <= 0) throw new Error('Cupón inválido.');

  await db.update(coupons).set({ isActive }).where(eq(coupons.id, id));

  revalidatePath('/admin/descuentos');
  revalidatePath('/checkout');
}

export async function deleteCoupon(id: number) {
  await requireAdmin();
  if (!Number.isInteger(id) || id <= 0) throw new Error('Cupón inválido.');

  await db.delete(coupons).where(eq(coupons.id, id));

  revalidatePath('/admin/descuentos');
  revalidatePath('/checkout');
}
