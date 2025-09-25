import { neon } from '@neondatabase/serverless';
export const sql = neon(process.env.DATABASE_URL!);
export async function q<T = any>(text: string, params: any[] = []) {
  const rows = await sql.unsafe(text, params);
  return { rows: rows as T[] };
}
