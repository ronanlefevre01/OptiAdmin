// src/lib/api.ts
export const API_BASE = (() => {
  const env = (import.meta as any).env || {};
  const base =
    env.VITE_SERVER_URL ||
    env.VITE_SERVER_BASE || // si jamais tu l’utilises encore
    'https://opticom-sms-server.onrender.com'; // fallback Render
  return String(base).replace(/\/$/, '');
})();

export const api = (path: string) =>
  `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
