import { expirePendingOrders } from './actions';

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  // Validate cron secret (prevents unauthorized calls)
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response('Unauthorized', { status: 401 });
    }
  }

  try {
    const url = new URL(request.url);
    const maxAge = parseInt(url.searchParams.get('maxAgeMinutes') ?? '30', 10);

    const result = await expirePendingOrders(maxAge);

    return Response.json({
      ok: true,
      expired: result.expired,
      releasedItems: result.releasedItems,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[expirePendingOrders] error:', error);
    return Response.json({ ok: false, error: String(error) }, { status: 500 });
  }
}
