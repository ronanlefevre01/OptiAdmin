import { neon } from '@neondatabase/serverless';

const OVE_DB_URL =
  process.env.OVE_DATABASE_URL ||
  process.env.DATABASE_URL_OVE || // fallback si jamais tu l'avais
  '';

if (!OVE_DB_URL) {
  throw new Error('Missing OVE_DATABASE_URL (or DATABASE_URL_OVE) in env vars');
}

// Tagged template query fn
export const sqlOVE = neon(OVE_DB_URL);

/**
 * Helper qui garde l’API "q`SELECT ... ${x}`".
 * ⚠️ Avec Neon, on N’UTILISE PAS "text + params", mais un tagged template.
 */
export function qOVE<T = any>(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<T[]> {
  return (sqlOVE as any)(strings, ...values) as Promise<T[]>;
}
