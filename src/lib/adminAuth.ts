import { api } from "./api";

const TOKEN_KEY = "opticom_admin_jwt";

export const getAdminToken = () => localStorage.getItem(TOKEN_KEY);
export const setAdminToken = (t: string) => localStorage.setItem(TOKEN_KEY, t);
export const clearAdminToken = () => localStorage.removeItem(TOKEN_KEY);

// Vérifie le token auprès du serveur
export async function ensureAdminAuth(): Promise<boolean> {
  const t = getAdminToken();
  if (!t) return false;
  try {
    const r = await fetch(api("/api/admin/me"), {
      headers: { Authorization: `Bearer ${t}` },
    });
    const j = await r.json().catch(() => null);
    return r.ok && j?.ok === true;
  } catch {
    return false;
  }
}

// Wrapper fetch pour les routes /api/admin/secure/*
export async function adminFetch(path: string, opts: RequestInit = {}) {
  const t = getAdminToken();
  const headers = new Headers(opts.headers || {});
  if (!headers.has("Content-Type") && opts.body) headers.set("Content-Type", "application/json");
  if (t) headers.set("Authorization", `Bearer ${t}`);

  const res = await fetch(api(path), { ...opts, headers });
  if (res.status === 401 || res.status === 403) {
    clearAdminToken();
    // renvoie au login
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("UNAUTHORIZED");
  }
  return res;
}
