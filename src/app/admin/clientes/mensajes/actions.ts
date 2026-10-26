'use server';

import { revalidatePath } from 'next/cache';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { contactMessages } from '@/drizzle/schema';

export async function getContactMessages() {
  return db.select().from(contactMessages).orderBy(asc(contactMessages.createdAt));
}

export async function updateContactMessageStatus(formData: FormData) {
  const id = Number(formData.get('id'));
  const status = String(formData.get('status') || 'read');
  if (!Number.isInteger(id) || !['new', 'read', 'replied', 'archived'].includes(status)) return;
  await db.update(contactMessages).set({
    status,
    readAt: status === 'new' ? null : new Date(),
    repliedAt: status === 'replied' ? new Date() : null,
  }).where(eq(contactMessages.id, id));
  revalidatePath('/admin/clientes/mensajes');
}
