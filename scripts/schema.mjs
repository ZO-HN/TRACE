// Disposable PostgreSQL engine: canonical SQL is executed, not parsed into a mock.
import { PGlite } from '@electric-sql/pglite';
import { readdir, readFile } from 'node:fs/promises';
export async function createSchema() {
  const db = new PGlite();
  await db.exec(`
    CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}', role text, aud text, email_confirmed_at timestamptz);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
      $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS
      $$ SELECT current_user::text $$;
    GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
    CREATE PUBLICATION supabase_realtime;
  `);
  try {
    for (const file of (await readdir(new URL('../supabase/migrations/', import.meta.url))).filter((f) => f.endsWith('.sql')).sort()) {
      try { await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), 'utf8')); }
      catch (error) { throw new Error(`Migration ${file}: ${error.message}`, { cause: error }); }
    }
    return db;
  } catch (error) { await db.close(); throw error; }
}
