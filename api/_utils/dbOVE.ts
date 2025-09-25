import { neon, neonConfig } from '@neondatabase/serverless';
neonConfig.fetchConnectionCache = true;

const OVE_DATABASE_URL = process.env.OVE_DATABASE_URL;
if (!OVE_DATABASE_URL) throw new Error('Missing OVE_DATABASE_URL');

const sql = neon(OVE_DATABASE_URL);

// Utilisation identique à ton q() : text + params
export async function qOVE<T = any>(text: string, params: any[] = []) {
  // @ts-ignore (neon accepte (text, params))
  const rows = await sql(text, params);
  return rows as T[];
}
