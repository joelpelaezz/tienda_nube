import { runBaseline } from './baseline-runner';

async function main(): Promise<void> {
  if (process.env.VERCEL_ENV !== 'preview' || process.env.BASELINE_PREVIEW_APPLY !== '1') return;

  const connectionUrl = process.env.POSTGRES_URL_NON_POOLING;
  if (!connectionUrl?.trim()) {
    throw new Error('Preview baseline requires POSTGRES_URL_NON_POOLING; no fallback URL is permitted.');
  }

  let url: URL;
  try {
    url = new URL(connectionUrl);
  } catch {
    throw new Error('POSTGRES_URL_NON_POOLING must be a valid PostgreSQL URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.pathname.slice(1)) {
    throw new Error('POSTGRES_URL_NON_POOLING must identify a PostgreSQL host and database.');
  }

  const database = decodeURIComponent(url.pathname.slice(1));
  const user = decodeURIComponent(url.username);
  if (!user) throw new Error('POSTGRES_URL_NON_POOLING must identify a database user.');

  await runBaseline([
    '--mode', 'apply',
    '--expected-host', url.hostname,
    '--expected-database', database,
    '--expected-user', user,
    '--target-environment', 'preview',
    '--confirm-database', database,
  ], {
    ...process.env,
    BASELINE_DATABASE_URL: connectionUrl,
    VERCEL_ENV: 'preview',
  });
}

main().catch((error: unknown) => {
  const rawMessage = error instanceof Error ? error.message : 'Unexpected Preview baseline failure.';
  const message = rawMessage.replace(/postgres(?:ql)?:\/\/[^\s'"`]+/gi, '[REDACTED_DATABASE_URL]');
  console.error(`Preview baseline stopped: ${message}`);
  process.exitCode = 1;
});
