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

function readCookie(req: VercelRequest, name: string): string {
  const raw = req.headers?.cookie || "";
  const m = raw.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : "";
}

function getBearer(auth?: string | null): string {
  if (!auth) return "";
  return auth.startsWith("Bearer ") ? auth.slice(7) : auth;
}

function getTokenFromReq(req: VercelRequest): string {
  const cookieToken = readCookie(req, "OVE_SESSION");
  if (cookieToken) return cookieToken;
  const bearer = getBearer(req.headers?.authorization);
  return bearer || "";
}

export function signJwtOVE(payload: OVEClaims): string {
  const secret = process.env.OVE_JWT_SECRET;
  if (!secret) throw new Error("ove_jwt_secret_missing");
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

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

export const requireJwtOVE = requireJwtFromReq;
export { requireJwtFromReq as requireJwt };
