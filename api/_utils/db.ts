import { neon } from '@neondatabase/serverless';

// DATABASE_URL doit être au format postgresql://...neon.tech/db?sslmode=require
export const sql = neon(process.env.DATABASE_URL!);

// Helper pour faire comme pg.query()
export async function q<T = any>(text: string, params: any[] = []) {
  const rows = await sql.unsafe(text, params); // support des paramètres
  return { rows: rows as T[] };
}
