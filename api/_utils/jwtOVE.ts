// api/_utils/jwtOVE.ts
import jwt, { JwtPayload } from "jsonwebtoken";
import type { VercelRequest } from "@vercel/node";

export type OVEClaims = {
  member_id: string;
  tenant_id: string;
  role: string;
  iat?: number;
  exp?: number;
};

/* -------------------- helpers -------------------- */

/** Lit un cookie dans req.headers.cookie (simple, sans dépendance). */
function readCookie(req: VercelRequest, name: string): string {
  const raw = req.headers?.cookie || "";
  const m = raw.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : "";
}

/** Extrait un Bearer token de façon robuste (casse & espaces). */
function getBearer(auth?: string | null): string {
  if (!auth) return "";
  const m = auth.trim().match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

/** Récupère le token à partir du cookie OVE_SESSION ou du header Authorization. */
export function getTokenFromReq(req: VercelRequest): string {
  // 1) Cookie HttpOnly recommandé
  const cookieToken = readCookie(req, "OVE_SESSION");
  if (cookieToken) return cookieToken;

  // 2) Ou Authorization: Bearer ...
  const bearer = getBearer(req.headers?.authorization);
  return bearer || "";
}

/* -------------------- public API -------------------- */

export function signJwtOVE(payload: OVEClaims): string {
  const secret = process.env.OVE_JWT_SECRET;
  if (!secret) throw new Error("ove_jwt_secret_missing");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

/**
 * Vérifie le JWT depuis la requête (cookie OVE_SESSION ou Authorization Bearer).
 * Lance 'unauthorized' si le token est manquant ou invalide.
 */
export function requireJwtFromReq(req: VercelRequest): OVEClaims {
  const secret = process.env.OVE_JWT_SECRET;
  if (!secret) throw new Error("ove_jwt_secret_missing");

  const token = getTokenFromReq(req);
  if (!token) throw new Error("unauthorized");

  const decoded = jwt.verify(token, secret) as JwtPayload | string;
  if (!decoded || typeof decoded !== "object") throw new Error("unauthorized");

  const { member_id, tenant_id, role } = decoded as OVEClaims;
  if (!member_id || !tenant_id) throw new Error("unauthorized");

  return { member_id, tenant_id, role: role || "client" };
}

/**
 * Autorise :
 *  - un utilisateur authentifié (cookie/bearer)
 *  - OU un bypass admin via headers 'X-Admin-Key' (+ 'X-Tenant-Id' optionnel)
 *    L'admin key attendue peut être dans OVE_ADMIN_KEY ou OVE_ADMIN_API_KEY.
 */
export function requireUserOrAdmin(req: VercelRequest): OVEClaims {
  const adminKeyProvided = String(req.headers["x-admin-key"] || "");
  const adminKeyExpected =
    process.env.OVE_ADMIN_KEY || process.env.OVE_ADMIN_API_KEY || "";

  if (adminKeyProvided && adminKeyExpected && adminKeyProvided === adminKeyExpected) {
    const tenant =
      String(req.headers["x-tenant-id"] || "") ||
      String(process.env.OVE_TENANT_ID || "");
    if (!tenant) throw new Error("tenant_missing");
    return { member_id: "admin-bypass", tenant_id: tenant, role: "admin" };
  }

  return requireJwtFromReq(req);
}

/* -------------------- aliases de compat -------------------- */
// Ancien nom utilisé dans certaines routes
export const requireJwtOVE = requireJwtFromReq;
// Alias court si tu veux importer { requireJwt }
export { requireJwtFromReq as requireJwt };
