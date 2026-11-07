import { dirname, resolve } from 'node:path';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { fileURLToPath, pathToFileURL } from 'node:url';

type Mode = 'preflight' | 'apply';

type Target = {
  host: string;
  database: string;
  user: string;
  environment: 'preview' | 'development' | 'disposable';
};

const LOCK_KEY = 7_382_914_021;
const LAST_TIMESTAMP = 1_792_497_100_143;
const REQUIRED_PAYMENT_TABLES = ['order_payments', 'payment_exceptions'];
const REQUIRED_PUBLIC_TABLES = [
  'accounts', 'categories', 'communication_events', 'contact_messages', 'coupons', 'customers',
  'newsletter_subscribers', 'order_items', 'order_payments', 'orders', 'payment_exceptions',
  'payment_methods', 'product_categories', 'product_images', 'product_stock_movements',
  'product_variant_options', 'product_variants', 'products', 'sessions', 'settings',
  'shipping_methods', 'shipping_rules', 'stock_movements', 'users', 'variant_options',
  'variant_types', 'verification_tokens',
];

function parseArgs(argv: string[]): { mode: Mode; target: Target; confirmation?: string } {
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    if (!key.startsWith('--') || !argv[i + 1] || argv[i + 1].startsWith('--')) {
      throw new Error('Invalid arguments. See BASELINE-CANDIDATE.md for exact usage.');
    }
    if (values.has(key)) throw new Error(`Duplicate argument: ${key}`);
    values.set(key, argv[++i]);
  }

  const mode = values.get('--mode');
  if (mode !== 'preflight' && mode !== 'apply') throw new Error('--mode must be preflight or apply.');
  const host = values.get('--expected-host');
  const database = values.get('--expected-database');
  const user = values.get('--expected-user');
  const environment = values.get('--target-environment');
  if (!host || !database || !user ||
      (environment !== 'preview' && environment !== 'development' && environment !== 'disposable')) {
    throw new Error('Expected host, database, user, and target environment (preview|development|disposable) are required.');
  }
  if ([...values.keys()].some((key) => !['--mode', '--expected-host', '--expected-database', '--expected-user', '--target-environment', '--confirm-database'].includes(key))) {
    throw new Error('Unknown argument.');
  }
  const confirmation = values.get('--confirm-database');
  if (mode === 'apply' && confirmation !== database) {
    throw new Error('Apply requires --confirm-database exactly matching --expected-database.');
  }
  if (mode === 'preflight' && confirmation) throw new Error('--confirm-database is only valid for apply.');
  return { mode, target: { host, database, user, environment }, confirmation };
}

function validateTarget(urlString: string, target: Target, vercelEnv?: string): URL {
  if (vercelEnv?.toLowerCase() === 'production') throw new Error('Production target is always refused.');
  if (target.environment !== 'disposable' && !vercelEnv) {
    throw new Error('VERCEL_ENV must be set for preview/development targets; use disposable only for local test databases.');
  }
  if (vercelEnv && target.environment !== 'disposable' && vercelEnv.toLowerCase() !== target.environment) {
    throw new Error('VERCEL_ENV does not match --target-environment.');
  }
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error('BASELINE_DATABASE_URL must be a valid PostgreSQL URL.');
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('Only PostgreSQL URLs are accepted.');
  if (url.hostname.toLowerCase() !== target.host.toLowerCase()) throw new Error('Connected host does not match --expected-host.');
  if (decodeURIComponent(url.pathname.slice(1)) !== target.database) throw new Error('URL database does not match --expected-database.');
  if (decodeURIComponent(url.username) !== target.user) throw new Error('URL user does not match --expected-user.');
  if (!url.hostname) throw new Error('Database host is unknown.');
  if (target.environment === 'disposable' && !['localhost', '127.0.0.1', '::1'].includes(url.hostname)) {
    throw new Error('Disposable targets must use a loopback host.');
  }
  if (target.environment !== 'disposable' && /(?:^|[-.])pooler(?:[-.]|$)/i.test(url.hostname)) {
    throw new Error('Migration targets must use a direct PostgreSQL endpoint, not a pooled endpoint.');
  }
  return url;
}

function assertServerVersion(version: string): void {
  if (!version.startsWith('16.') && !version.startsWith('18.')) {
    throw new Error(`Only PostgreSQL 16 or 18 is allowed; server reported ${version}.`);
  }
}

type DatabaseState = {
  schemas: string[];
  relations: string[];
  publicTables: string[];
  migrationCount: number | null;
  latestMigration: string | null;
  hasRequiredPaymentTables: boolean;
};

async function inspectDatabase(sql: ReturnType<typeof postgres>): Promise<DatabaseState> {
  const schemas = await sql<{ nspname: string }[]>`
    select nspname from pg_namespace
    where nspname not like 'pg_%' and nspname <> 'information_schema' and nspname <> 'public'
    order by nspname
  `;

  const relations = await sql<{ relation_name: string }[]>`
    select n.nspname || '.' || c.relname as relation_name
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname not in ('pg_catalog', 'information_schema')
      and n.nspname not like 'pg_toast%'
      and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
    order by n.nspname, c.relname
  `;

  const publicTables = await sql<{ table_name: string }[]>`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_type = 'BASE TABLE'
    order by table_name
  `;

  const metadataPresence = await sql<{ present: boolean }[]>`
    select to_regclass('drizzle.__drizzle_migrations') is not null as present
  `;
  if (!metadataPresence[0]?.present) {
    const paymentTables = await sql<{ table_name: string }[]>`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_name = any(${REQUIRED_PAYMENT_TABLES})
    `;
    return {
      schemas: schemas.map(({ nspname }) => nspname),
      relations: relations.map(({ relation_name }) => relation_name),
      publicTables: publicTables.map(({ table_name }) => table_name),
      migrationCount: null,
      latestMigration: null,
      hasRequiredPaymentTables: REQUIRED_PAYMENT_TABLES.every((table) => paymentTables.some(({ table_name }) => table_name === table)),
    };
  }

  const [metadata] = await sql<{ count: string; latest: string | null }[]>`
    select count(*)::text as count, max(created_at)::text as latest from drizzle.__drizzle_migrations
  `;
  return {
    schemas: schemas.map(({ nspname }) => nspname),
    relations: relations.map(({ relation_name }) => relation_name),
    publicTables: publicTables.map(({ table_name }) => table_name),
    migrationCount: Number(metadata.count),
    latestMigration: metadata.latest,
    hasRequiredPaymentTables: (await sql<{ table_name: string }[]>`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_name = any(${REQUIRED_PAYMENT_TABLES})
    `).length === REQUIRED_PAYMENT_TABLES.length,
  };
}

function isEmptyApplicationTarget(state: DatabaseState): boolean {
  const unexpectedSchemas = state.schemas.filter((schema) => schema !== 'neon_auth');
  const unexpectedRelations = state.relations.filter((relation) => !relation.startsWith('neon_auth.'));
  return unexpectedSchemas.length === 0 && unexpectedRelations.length === 0 &&
    state.publicTables.length === 0 && state.migrationCount === null;
}

function isCompleteBaseline(state: DatabaseState): boolean {
  const expectedTables = new Set(REQUIRED_PUBLIC_TABLES);
  const actualTables = new Set(state.publicTables);
  const tablesMatch = actualTables.size === expectedTables.size &&
    [...expectedTables].every((table) => actualTables.has(table));
  const schemasMatch = state.schemas.every((schema) => schema === 'neon_auth' || schema === 'drizzle');
  return schemasMatch && state.migrationCount === 21 && Number(state.latestMigration) === LAST_TIMESTAMP &&
    state.hasRequiredPaymentTables && tablesMatch;
}

function assertEmptyApplicationTarget(state: DatabaseState): void {
  if (!isEmptyApplicationTarget(state)) {
    throw new Error('Apply refused: application schemas or Drizzle history already exist. Neon-managed neon_auth objects are preserved; this runner never adopts an existing app schema.');
  }
}

async function verifyResult(sql: ReturnType<typeof postgres>): Promise<void> {
  const state = await inspectDatabase(sql);
  if (!isCompleteBaseline(state)) throw new Error('Migration metadata or final application schema verification failed.');
}

export async function runBaseline(args: string[], env: NodeJS.ProcessEnv = process.env): Promise<void> {
  const { mode, target } = parseArgs(args);
  const connectionUrl = env.BASELINE_DATABASE_URL;
  if (!connectionUrl?.trim()) throw new Error('BASELINE_DATABASE_URL is required.');
  const url = validateTarget(connectionUrl, target, env.VERCEL_ENV);
  const remote = !['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  const sql = postgres(connectionUrl, {
    max: 1,
    ssl: remote ? 'require' : false,
    connect_timeout: 10,
    ...(mode === 'preflight' ? { connection: { default_transaction_read_only: true } } : {}),
  });
  let locked = false;
  try {
    const identity = await sql<{ database: string; username: string; version: string }[]>`
      select current_database() as database, current_user as username, current_setting('server_version') as version
    `;
    if (identity[0]?.database !== target.database || identity[0]?.username !== target.user) {
      throw new Error('Server-reported database identity does not match the expected target.');
    }
    assertServerVersion(identity[0].version);

    if (mode === 'preflight') {
      const state = await inspectDatabase(sql);
      const eligible = isEmptyApplicationTarget(state);
      console.info(JSON.stringify({
        status: eligible
          ? (state.schemas.includes('neon_auth') ? 'neon-managed-schema-only-eligible-for-review' : 'empty-eligible-for-review')
          : 'non-empty-review-required',
        target: { host: target.host, database: target.database, user: target.user, environment: target.environment },
        postgresVersion: identity[0].version,
        userSchemas: state.schemas,
        userRelations: state.relations,
        publicTables: state.publicTables,
        migrationCount: state.migrationCount,
        latestMigration: state.latestMigration,
      }, null, 2));
      return;
    }

    if (mode === 'apply') {
      await sql`select pg_advisory_lock(${LOCK_KEY})`;
      locked = true;
    }

    const state = await inspectDatabase(sql);
    if (mode === 'apply' && isCompleteBaseline(state)) {
      console.info('Known complete baseline already present; no-op.');
      return;
    }
    assertEmptyApplicationTarget(state);
    console.info(`Empty-target preflight passed for explicitly expected ${target.environment} database; PostgreSQL ${identity[0].version}.`);

    const db = drizzle(sql);
    const runnerDir = dirname(fileURLToPath(import.meta.url));
    const baselinePath = resolve(runnerDir, '../experiments/baseline-reference/migrations');
    const currentPath = resolve(runnerDir, '../src/drizzle/migrations');
    await migrate(db, { migrationsFolder: baselinePath });
    await migrate(db, { migrationsFolder: currentPath });
    await verifyResult(sql);
    console.info('Experimental baseline applied and post-migration checks passed.');
  } finally {
    if (locked) {
      try { await sql`select pg_advisory_unlock(${LOCK_KEY})`; } catch { /* connection close releases session lock */ }
    }
    await sql.end({ timeout: 5 });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runBaseline(process.argv.slice(2)).catch((error: unknown) => {
    const rawMessage = error instanceof Error ? error.message : 'Unexpected baseline runner failure.';
    const message = rawMessage.replace(/postgres(?:ql)?:\/\/[^\s'"`]+/gi, '[REDACTED_DATABASE_URL]');
    console.error(`Baseline runner stopped: ${message}`);
    process.exitCode = 1;
  });
}
