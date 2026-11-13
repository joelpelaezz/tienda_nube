const LOCAL_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5434/tienda_nube';

export type DatabaseEnvironment = {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  POSTGRES_URL?: string;
};

export function getDatabaseUrl(
  env: DatabaseEnvironment = process.env
): string {
  const configuredUrl = env.POSTGRES_URL?.trim();
  if (configuredUrl) return configuredUrl;

  const isVercelDeployment = env.VERCEL_ENV === 'preview' || env.VERCEL_ENV === 'production';
  if (isVercelDeployment || env.NODE_ENV === 'production') {
    throw new Error('POSTGRES_URL is required for deployed and production runtimes.');
  }

  // C4-TRACE: local defaults must never conceal a missing deployed database connection.
  return LOCAL_DATABASE_URL;
}
