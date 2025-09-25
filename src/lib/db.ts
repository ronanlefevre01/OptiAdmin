import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export async function q<T = any>(text: string, params?: any[]) {
  const res = await pool.query<T>(text, params);
  return res;
}
