// src/lib/adminAuth.ts
import { api } from './api';

const KEY = 'admin_jwt';

export function getAdminToken() {
  try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
}
export function setAdminToken(token: string) {
  try { localStorage.setItem(KEY, token); } catch {}
}
export function clearAdminToken() {
  try { localStorage.removeItem(KEY); } catch {}
}

/** Retourne true si un token existe et que /admin/me répond OK, sinon false (et purge le token). */
export async function ensureAdminAuth(): Promise<boolean> {
  const token = getAdminToken();
  if (!token) return false;

  try {
    const r = await fetch(api('admin/me'), {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!r.ok) throw new Error(String(r.status));
    return true;
  } catch {
    clearAdminToken();
    return false;
  }
}
