// C4-TRACE: snapshot tooling is isolated from Drizzle's migration-writing CLI.
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { generateDrizzleJson, generateMigration } = require('drizzle-kit/api');
import * as schema from '../../src/drizzle/schema.ts';

const metaDir = new URL('../../src/drizzle/migrations/meta/', import.meta.url);
const previousPath = new URL('0017_snapshot.json', metaDir);
const targetPath = new URL('0020_snapshot.json', metaDir);
const journalPath = new URL('_journal.json', metaDir);
const previous = JSON.parse(await readFile(previousPath, 'utf8'));
const journal = JSON.parse(await readFile(journalPath, 'utf8'));

if (journal.entries.at(-1)?.tag !== '0020_payment_exceptions') {
  throw new Error('Expected migration journal to end at 0020_payment_exceptions');
}

const mode = process.argv[2];
if (mode === 'create') {
  try {
    await readFile(targetPath);
    throw new Error('Refusing to overwrite existing 0020_snapshot.json');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  const snapshot = generateDrizzleJson(schema, previous.id);
  await writeFile(targetPath, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: 'wx' });
  console.log(`Created ${fileURLToPath(targetPath)} from current schema; prevId=${snapshot.prevId}`);
} else if (mode === 'verify') {
  const stored = JSON.parse(await readFile(targetPath, 'utf8'));
  const fresh = generateDrizzleJson(schema, stored.prevId);
  const statements = await generateMigration(stored, fresh);
  if (statements.length) {
    console.error(`Schema diff is not empty (${statements.length} statements):`);
    console.error(statements.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Drizzle schema diff against stored 0020 snapshot is empty.');
  }
} else {
  throw new Error('Usage: node --import tsx snapshot-0020.mjs <create|verify>');
}
