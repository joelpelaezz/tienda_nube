'use server';

import { revalidatePath } from 'next/cache';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { shippingMethods, shippingRules } from '@/drizzle/schema';

function moneyToCents(value: FormDataEntryValue | null) {
  const parsed = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : 0;
}

export async function getShippingConfiguration() {
  const methods = await db.select().from(shippingMethods).orderBy(asc(shippingMethods.position));
  const rules = await db.select().from(shippingRules).orderBy(asc(shippingRules.position));
  return { methods, rules };
}

export async function createShippingMethod(formData: FormData) {
  const code = String(formData.get('code') || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const name = String(formData.get('name') || '').trim();
  if (!code || !name) return;

  await db.insert(shippingMethods).values({
    code,
    name,
    carrier: String(formData.get('carrier') || 'rules'),
    baseCost: moneyToCents(formData.get('baseCost')),
    freeFrom: formData.get('freeFrom') ? moneyToCents(formData.get('freeFrom')) : null,
    estimatedDays: String(formData.get('estimatedDays') || '').trim() || null,
    isActive: formData.get('isActive') === 'on',
    position: Number(formData.get('position')) || 0,
  }).onConflictDoNothing({ target: shippingMethods.code });

  revalidatePath('/admin/envios');
}

export async function updateShippingMethod(formData: FormData) {
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return;

  await db.update(shippingMethods).set({
    name: String(formData.get('name') || '').trim(),
    carrier: String(formData.get('carrier') || 'rules'),
    baseCost: moneyToCents(formData.get('baseCost')),
    freeFrom: formData.get('freeFrom') ? moneyToCents(formData.get('freeFrom')) : null,
    estimatedDays: String(formData.get('estimatedDays') || '').trim() || null,
    isActive: formData.get('isActive') === 'on',
    updatedAt: new Date(),
  }).where(eq(shippingMethods.id, id));

  revalidatePath('/admin/envios');
}

export async function saveShippingRule(formData: FormData) {
  const id = Number(formData.get('id'));
  const shippingMethodId = Number(formData.get('shippingMethodId'));
  if (!Number.isInteger(shippingMethodId)) return;

  const values = {
    shippingMethodId,
    name: String(formData.get('name') || '').trim() || 'Regla de envío',
    postalPrefix: String(formData.get('postalPrefix') || '').trim().toUpperCase().replace(/[\s-]/g, ''),
    cost: moneyToCents(formData.get('cost')),
    freeFrom: formData.get('freeFrom') ? moneyToCents(formData.get('freeFrom')) : null,
    estimatedDays: String(formData.get('estimatedDays') || '').trim() || null,
    isActive: formData.get('isActive') === 'on',
    position: Number(formData.get('position')) || 0,
  };

  if (Number.isInteger(id) && id > 0) await db.update(shippingRules).set(values).where(eq(shippingRules.id, id));
  else await db.insert(shippingRules).values(values);
  revalidatePath('/admin/envios');
}
