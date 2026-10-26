import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { newsletterSubscribers } from '@/drizzle/schema';

export const dynamic = 'force-dynamic';

const recentSubmissions = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const website = typeof body.website === 'string' ? body.website.trim() : '';

    if (website) return NextResponse.json({ ok: true });
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 180) {
      return NextResponse.json({ error: 'Ingresá un email válido.' }, { status: 400 });
    }
    if (name.length > 120) {
      return NextResponse.json({ error: 'El nombre no puede superar los 120 caracteres.' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const ipHash = createHash('sha256').update(ip).digest('hex');
    const lastSubmission = recentSubmissions.get(ipHash) || 0;
    if (Date.now() - lastSubmission < 60_000) {
      return NextResponse.json({ error: 'Esperá un minuto antes de volver a suscribirte.' }, { status: 429 });
    }

    const now = new Date();
    await db.insert(newsletterSubscribers).values({
      name: name || null,
      email,
      source: 'homepage',
      consentAt: now,
      subscribedAt: now,
      updatedAt: now,
    }).onConflictDoUpdate({
      target: newsletterSubscribers.email,
      set: {
        name: name || null,
        status: 'subscribed',
        source: 'homepage',
        consentAt: now,
        subscribedAt: now,
        unsubscribedAt: null,
        updatedAt: now,
      },
    });

    recentSubmissions.set(ipHash, Date.now());
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/newsletter]', error);
    return NextResponse.json({ error: 'No pudimos completar la suscripción.' }, { status: 500 });
  }
}
