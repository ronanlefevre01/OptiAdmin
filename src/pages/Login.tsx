import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { setAdminToken } from "../lib/adminAuth";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();
  const loc = useLocation() as any;
  const redirectTo = loc?.state?.from?.pathname || "/";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const r = await fetch(api("admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok || !j?.token) {
        throw new Error(j?.error || "Identifiants invalides");
      }
      setAdminToken(j.token);
      nav(redirectTo, { replace: true });
    } catch (e: any) {
      setErr(e?.message || "Connexion impossible");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-white p-6 rounded-xl shadow">
        <h1 className="text-xl font-semibold mb-4">Connexion OptiAdmin</h1>

        <label className="block text-sm mb-1">Email</label>
        <input
          className="w-full border rounded px-3 py-2 mb-3"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label className="block text-sm mb-1">Mot de passe</label>
        <input
          className="w-full border rounded px-3 py-2 mb-4"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {err && <div className="text-red-600 text-sm mb-3">{err}</div>}

        <button
          className="w-full rounded bg-blue-600 text-white py-2 font-semibold disabled:opacity-60"
          disabled={loading}
          type="submit"
        >
          {loading ? "Connexion…" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
