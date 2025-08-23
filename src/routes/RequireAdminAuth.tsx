import React, { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ensureAdminAuth } from "../lib/adminAuth";

export default function RequireAdminAuth() {
  const [state, setState] = useState<"checking" | "ok" | "ko">("checking");
  const location = useLocation();

  useEffect(() => {
    let alive = true;
    (async () => {
      const ok = await ensureAdminAuth();
      if (alive) setState(ok ? "ok" : "ko");
    })();
    return () => { alive = false; };
  }, []);

  if (state === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Vérification…</div>
      </div>
    );
  }
  if (state === "ko") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <Outlet />;
}
