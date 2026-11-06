import { expirePendingOrders } from './actions';
import { parseExpiryAge } from '@/lib/payment-security';

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  // C4-TRACE: no configured secret means no cron access.
  if (!cronSecret?.trim() || request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const ages = url.searchParams.getAll('maxAgeMinutes');
    const maxAge = ages.length > 1 ? null : parseExpiryAge(ages[0] ?? null);
    if (maxAge === null) return Response.json({ ok: false, error: 'Invalid age' }, { status: 400 });

    const result = await expirePendingOrders(maxAge);

    return Response.json({
      ok: true,
      expired: result.expired,
      releasedItems: result.releasedItems,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[expirePendingOrders] error:', error);
    return Response.json({ ok: false, error: 'Internal error' }, { status: 500 });
  }
}
