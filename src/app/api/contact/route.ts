import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { db } from '@/lib/db';
import { contactMessages } from '@/drizzle/schema';

export const dynamic = 'force-dynamic';

const recentSubmissions = new Map<string, number>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : null;
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const website = typeof body.website === 'string' ? body.website.trim() : '';

    if (website) return NextResponse.json({ ok: true });
    if (!name || name.length > 120 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 180) {
      return NextResponse.json({ error: 'Completá nombre y un email válido.' }, { status: 400 });
    }
    if (!message || message.length > 4000 || (phone && phone.length > 40)) {
      return NextResponse.json({ error: 'El mensaje no es válido.' }, { status: 400 });
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const ipHash = createHash('sha256').update(ip).digest('hex');
    const lastSubmission = recentSubmissions.get(ipHash) || 0;
    if (Date.now() - lastSubmission < 60_000) {
      return NextResponse.json({ error: 'Esperá un minuto antes de enviar otro mensaje.' }, { status: 429 });
    }

    await db.insert(contactMessages).values({ name, email, phone: phone || null, message, ipHash });
    recentSubmissions.set(ipHash, Date.now());
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[POST /api/contact]', error);
    return NextResponse.json({ error: 'No pudimos guardar tu mensaje.' }, { status: 500 });
  }
}
