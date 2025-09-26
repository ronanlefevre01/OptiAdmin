// api/_utils/dbOVE.ts
import { neon, Client } from '@neondatabase/serverless';

const OVE_DB_URL =
  process.env.OVE_DATABASE_URL ||
  process.env.DATABASE_URL_OVE || // fallback si tu t’es trompé de nom
  '';

if (!OVE_DB_URL) {
  throw new Error('Missing OVE_DATABASE_URL (or DATABASE_URL_OVE) in env vars');
}

// Tagged template (neon) — le plus perf
const sqlTag = neon(OVE_DB_URL);

/**
 * q : accepte EITHER
 *   - q`SELECT ... ${val}`               (tagged template)
 *   - q('SELECT $1', [val])              (text + params)
 * Retourne toujours T[].
 */
export async function q<T = any>(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<T[]>;
export async function q<T = any>(text: string, params?: any[]): Promise<T[]>;
export async function q<T = any>(first: any, ...rest: any[]): Promise<T[]> {
  // Cas 1: tagged template
  if (Array.isArray(first) && 'raw' in first) {
    const strings = first as TemplateStringsArray;
    return (sqlTag as any)(strings, ...rest) as Promise<T[]>;
  }

  // Cas 2: text + params
  const text = String(first);
  const params = (rest && rest[0]) as any[] | undefined;

  const client = new Client(OVE_DB_URL);
  await client.connect();
  try {
    const r = await client.query(text, params ?? []);
    return (r.rows as unknown) as T[];
  } finally {
    await client.end();
  }
}
