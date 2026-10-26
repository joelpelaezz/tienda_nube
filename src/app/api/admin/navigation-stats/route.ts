import { NextResponse } from 'next/server';
import { count, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { contactMessages, newsletterSubscribers, shippingMethods } from '@/drizzle/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [messages, subscribers, shipping] = await Promise.all([
    db.select({ value: count() }).from(contactMessages).where(eq(contactMessages.status, 'new')),
    db.select({ value: count() }).from(newsletterSubscribers).where(eq(newsletterSubscribers.status, 'subscribed')),
    db.select({ value: count() }).from(shippingMethods).where(eq(shippingMethods.isActive, true)),
  ]);

  return NextResponse.json({
    messages: Number(messages[0]?.value ?? 0),
    subscribers: Number(subscribers[0]?.value ?? 0),
    shipping: Number(shipping[0]?.value ?? 0),
  });
}
