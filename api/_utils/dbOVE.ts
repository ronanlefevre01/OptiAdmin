// api/_utils/dbOVE.ts
import { neon } from "@neondatabase/serverless";

const URL =
  process.env.OVE_DATABASE_URL ||
  process.env.DATABASE_URL ||
  "";

if (!URL) {
  throw new Error("OVE_DATABASE_URL (ou DATABASE_URL) manquant");
}

// Neon v2: "sql" est un tagged-template function, et expose aussi .query(text, params)
const sql = neon(URL);

type Row = Record<string, any>;

/**
 * qOVE : exécute une requête SQL en mode:
 *   - tagged template: qOVE`SELECT * FROM t WHERE id = ${id}`
 *   - texte + params : qOVE("SELECT * FROM t WHERE id = $1", [id])
 * Retourne toujours un tableau de lignes (T[]).
 */
export async function qOVE<T extends Row = Row>(
  textOrTpl: string | TemplateStringsArray,
  ...values: any[]
): Promise<T[]> {
  // Mode "tagged template"
  if (Array.isArray(textOrTpl) && "raw" in textOrTpl) {
    const rows = await (sql as any)<T>(textOrTpl as any, ...values);
    // sql`...` retourne déjà T[]
    return rows as T[];
  }

  // Mode "texte + params"
  const text = textOrTpl as string;
  const params = (values[0] ?? []) as any[];
  const res = await (sql as any).query<T>(text, params);
  // .query() retourne { rows: T[] }
  return (res?.rows ?? []) as T[];
}

/** Renvoie une seule ligne (ou null) */
export async function oneOVE<T extends Row = Row>(
  textOrTpl: string | TemplateStringsArray,
  ...values: any[]
): Promise<T | null> {
  const rows = await qOVE<T>(textOrTpl, ...values);
  return rows[0] ?? null;
}

export { sql as rawSqlOVE };
