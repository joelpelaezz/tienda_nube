import { defineConfig } from 'drizzle-kit';

const url = process.env.BASELINE_REFERENCE_DATABASE_URL;
if (!url?.trim()) {
  throw new Error('BASELINE_REFERENCE_DATABASE_URL is required');
}

export default defineConfig({
  schema: './src/drizzle/schema.ts',
  out: './experiments/baseline-reference/migrations',
  dialect: 'postgresql',
  dbCredentials: { url },
});
