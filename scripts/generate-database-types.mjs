import { createSchema } from './schema.mjs';
import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';

const db = await createSchema();
try {
  const { rows: enums } = await db.query(`SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS labels
    FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace
    WHERE n.nspname='public' GROUP BY t.typname ORDER BY t.typname`);
  const enumNames = new Set(enums.map((e) => e.typname));
  const type = (name) => {
    if (name.startsWith('_')) return `(${type(name.slice(1))})[]`;
    if (enumNames.has(name)) return `Database['public']['Enums'][${JSON.stringify(name)}]`;
    if (['int2','int4','int8','float4','float8','numeric','oid'].includes(name)) return 'number';
    if (name === 'bool') return 'boolean';
    if (['json','jsonb'].includes(name)) return 'Json';
    if (name === 'void') return 'undefined';
    if (['uuid','text','varchar','bpchar','date','time','timetz','timestamp','timestamptz','name'].includes(name)) return 'string';
    throw new Error(`Unmapped database type: ${name}`);
  };
  const { rows: columns } = await db.query(`SELECT table_name, column_name, udt_name, is_nullable, column_default, is_generated
    FROM information_schema.columns WHERE table_schema='public' ORDER BY table_name, ordinal_position`);
  const { rows: relationships } = await db.query(`SELECT c.conname, a.relname AS source, b.relname AS target,
    ARRAY(SELECT attname FROM unnest(c.conkey) WITH ORDINALITY k(num, ord) JOIN pg_attribute ON attrelid=c.conrelid AND attnum=k.num ORDER BY ord) AS columns,
    ARRAY(SELECT attname FROM unnest(c.confkey) WITH ORDINALITY k(num, ord) JOIN pg_attribute ON attrelid=c.confrelid AND attnum=k.num ORDER BY ord) AS refs
    FROM pg_constraint c JOIN pg_class a ON a.oid=c.conrelid JOIN pg_class b ON b.oid=c.confrelid
    JOIN pg_namespace n ON n.oid=b.relnamespace WHERE c.contype='f' AND n.nspname='public' ORDER BY c.conname`);
  let output = '// Generated from TRACE canonical migrations by npm run db:types. Do not edit.\n';
  output += 'export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\n';
  output += 'export type Database = { public: { Tables: {\n';
  for (const table of [...new Set(columns.map((c) => c.table_name))]) {
    const fields = columns.filter((c) => c.table_name === table);
    output += `  ${JSON.stringify(table)}: {\n`;
    for (const shape of ['Row','Insert','Update']) {
      output += `    ${shape}: {\n`;
      for (const c of fields) {
        const generated = c.is_generated !== 'NEVER';
        const optional = shape === 'Update' || (shape === 'Insert' && (c.column_default !== null || c.is_nullable === 'YES' || generated));
        const value = shape !== 'Row' && generated ? 'never' : type(c.udt_name) + (c.is_nullable === 'YES' ? ' | null' : '');
        output += `      ${JSON.stringify(c.column_name)}${optional ? '?' : ''}: ${value};\n`;
      }
      output += '    };\n';
    }
    output += '    Relationships: [\n';
    for (const r of relationships.filter((r) => r.source === table)) output += `      { foreignKeyName: ${JSON.stringify(r.conname)}; columns: ${JSON.stringify(r.columns)}; isOneToOne: false; referencedRelation: ${JSON.stringify(r.target)}; referencedColumns: ${JSON.stringify(r.refs)} },\n`;
    output += '    ];\n  };\n';
  }
  output += '}; Views: { [_ in never]: never }; Functions: {\n';
  const { rows: functions } = await db.query(`SELECT p.proname, p.proargnames, p.proargmodes, p.pronargdefaults, p.proretset, t.typname AS result,
    ARRAY(SELECT typname FROM unnest(COALESCE(p.proallargtypes, p.proargtypes::oid[])) WITH ORDINALITY a(id, ord) JOIN pg_type ON oid=a.id ORDER BY ord) AS types
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_type t ON t.oid=p.prorettype
    WHERE n.nspname='public' AND t.typname <> 'trigger' ORDER BY p.proname`);
  for (const f of functions) {
    const fields = f.types.map((t, i) => ({ type: type(t), name: f.proargnames?.[i] ?? `arg${i}`, mode: f.proargmodes?.[i] ?? 'i' }));
    const inputs = fields.filter((a) => a.mode === 'i');
    const outputs = fields.filter((a) => a.mode === 't' || a.mode === 'o');
    const args = inputs.length ? `{ ${inputs.map((a, i) => `${JSON.stringify(a.name)}${i >= inputs.length - f.pronargdefaults ? '?' : ''}: ${a.type}`).join('; ')} }` : 'Record<string, never>';
    const result = outputs.length ? `{ ${outputs.map((a) => `${JSON.stringify(a.name)}: ${a.type}`).join('; ')} }` : type(f.result);
    output += `  ${JSON.stringify(f.proname)}: { Args: ${args}; Returns: ${result}${f.proretset ? '[]' : ''} };\n`;
  }
  output += '}; Enums: {\n';
  for (const e of enums) output += `  ${JSON.stringify(e.typname)}: ${e.labels.map(JSON.stringify).join(' | ')};\n`;
  output += '}; CompositeTypes: { [_ in never]: never }; } };\n';
  const client = process.env.TRACE_CLIENT_PATH ?? '../TRACE-client';
  const paths = ['src/lib/database.types.ts'];
  try { await access(resolve(client, 'package.json')); paths.push(resolve(client, 'src/lib/database.types.ts')); }
  catch { if (process.env.TRACE_CLIENT_PATH) throw new Error('TRACE_CLIENT_PATH must point to the client checkout'); }
  for (const path of paths) {
    if (process.argv.includes('--check')) {
      if (await readFile(path, 'utf8') !== output) throw new Error(`${path} is stale. Run npm run db:types.`);
    } else await writeFile(path, output);
  }
  console.log(`Database types ${process.argv.includes('--check') ? 'verified' : 'generated'} for ${paths.length} app(s).`);
} finally { await db.close(); }
