import { readdir, readFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createSchema } from './schema.mjs';

async function files(path) {
  const result = [];
  for (const item of await readdir(path, { withFileTypes: true })) {
    const full = join(path, item.name);
    if (item.isDirectory()) result.push(...await files(full));
    else if (/\.(ts|tsx)$/.test(item.name)) result.push(full);
  }
  return result;
}
const client = resolve(process.env.TRACE_CLIENT_PATH ?? '../TRACE-client');
await access(join(client, 'package.json'));
const db = await createSchema();
try {
  const tables = new Set((await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows.map((r) => r.tablename));
  const functions = new Set((await db.query("SELECT proname FROM pg_proc JOIN pg_namespace n ON n.oid=pronamespace WHERE n.nspname='public'")).rows.map((r) => r.proname));
  const missing = [];
  for (const file of [...await files('src'), ...await files(join(client,'src')), ...await files(join(client,'app'))]) {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/\.(from|rpc)\(['"]([^'"]+)['"]/g)) {
      if (!(match[1] === 'from' ? tables : functions).has(match[2])) missing.push(`${file}: missing ${match[1]} ${match[2]}`);
    }
  }
  if (missing.length) throw new Error(missing.join('\n'));
  console.log('Both apps reference tables and RPCs present in the canonical migrations.');
} finally { await db.close(); }
