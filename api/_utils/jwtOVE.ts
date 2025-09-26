// /api/_utils/jwtOVE.ts
import jwt, { SignOptions, JwtPayload } from "jsonwebtoken";

export type OVEJwtPayload = {
  member_id: string;
  tenant_id: string;
  role: "client" | "admin" | "demo" | string;
  iat?: number;
  exp?: number;
};

function getOVESecret(): string {
  const secret = process.env.OVE_JWT_SECRET;
  if (!secret) {
    // même message qu’on remonte côté API pour bien diagnostiquer
    throw new Error("ove_jwt_secret_missing");
  }
  return secret;
}

/** Signe un JWT avec OVE_JWT_SECRET */
export function signJwtOVE(
  payload: OVEJwtPayload,
  expiresIn: string | number = "7d"
): string {
  const options: SignOptions = { expiresIn };
  return jwt.sign(payload, getOVESecret(), options);
}

/** Vérifie le JWT (header Authorization: Bearer <token>) et renvoie son payload */
export function requireJwtOVE(authorization?: string): OVEJwtPayload {
  const auth = (authorization || "").trim();
  const [scheme, token] = auth.split(" ");
  if (!token || scheme.toLowerCase() !== "bearer") {
    throw new Error("unauthorized");
  }
  const decoded = jwt.verify(token, getOVESecret());
  if (typeof decoded === "string") throw new Error("invalid_token");

  const p = decoded as JwtPayload & OVEJwtPayload;
  if (!p.member_id || !p.tenant_id) throw new Error("invalid_token");
  return p;
}
