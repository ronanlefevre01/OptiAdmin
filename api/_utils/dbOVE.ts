// api/_utils/dbOVE.ts
import { neon } from '@neondatabase/serverless';

const connStr =
  process.env.DATABASE_URL_OVE || process.env.DATABASE_URL || '';

if (!connStr) {
  throw new Error('Missing DATABASE_URL_OVE or DATABASE_URL');
}

// Client Neon spécifique OVE
const sqlOVE = neon(connStr);

// Petit helper: requête SQL paramétrée ($1, $2, …) -> rows
export async function qOVE<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const res = await sqlOVE.query<T>(text, params); // <= IMPORTANT: .query(...)
  return (res.rows as unknown) as T[];
}
