// api/_utils/db.ts
import { neon } from "@neondatabase/serverless";

// Client Neon (serverless)
export const sql = neon(process.env.DATABASE_URL!);

/**
 * Petite couche compat pour exécuter des requêtes "text + params"
 * et toujours retourner { rows: T[] } quel que soit le shape renvoyé
 * par la version de @neondatabase/serverless.
 */
export async function q<T = any>(text: string, params: any[] = []) {
  // Certaines versions typent .unsafe(text) (1 arg) alors qu'elle accepte bien (text, params).
  // On caste en any pour garder la compat multi-versions.
  const res: any = await (sql as any).unsafe(text, params);

  // Neon peut renvoyer directement un tableau de rows,
  // ou un objet { rows }, selon les versions.
  if (Array.isArray(res)) {
    return { rows: res as T[] };
  }
  if (res && Array.isArray(res.rows)) {
    return { rows: res.rows as T[] };
  }
  // Fallback : on tente de caster en tableau
  return { rows: (res as unknown as T[]) ?? [] };
}
