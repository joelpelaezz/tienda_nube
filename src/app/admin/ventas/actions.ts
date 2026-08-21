'use server';

import { db } from '@/lib/db';
import { orders } from '@/drizzle/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function updateOrderStatus(orderId: number, status: string) {
  await db
    .update(orders)
    .set({ status, updatedAt: new Date() } as any)
    .where(eq(orders.id, orderId));

  revalidatePath(`/admin/ventas`);
  revalidatePath(`/admin/ventas/${orderId}`);
}
