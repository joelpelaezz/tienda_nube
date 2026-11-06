'use server';

import { revalidatePath } from 'next/cache';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { newsletterSubscribers } from '@/drizzle/schema';
import { requireAdmin } from '@/lib/auth';

export async function getNewsletterSubscribers() {
  await requireAdmin();
  return db.select().from(newsletterSubscribers).orderBy(asc(newsletterSubscribers.createdAt));
}

export async function updateNewsletterSubscriberStatus(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get('id'));
  const status = String(formData.get('status') || 'subscribed');
  if (!Number.isInteger(id) || !['subscribed', 'unsubscribed'].includes(status)) return;

  const now = new Date();
  await db.update(newsletterSubscribers).set({
    status,
    unsubscribedAt: status === 'unsubscribed' ? now : null,
    subscribedAt: status === 'subscribed' ? now : undefined,
    updatedAt: now,
  }).where(eq(newsletterSubscribers.id, id));

  revalidatePath('/admin/suscripciones');
}
