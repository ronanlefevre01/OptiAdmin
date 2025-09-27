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
  if (!secret) throw new Error("ove_jwt_secret_missing");
  return secret;
}

// Signe le JWT (par défaut 7 jours)
export function signJwtOVE(
  payload: OVEJwtPayload,
  options?: SignOptions
): string {
  const opts: SignOptions = { expiresIn: "7d", ...(options || {}) };
  return jwt.sign(payload, getOVESecret(), opts);
}

// >>> IMPORTANT: TOUJOURS jeter "unauthorized" si problème
export function requireJwtOVE(authorization?: string): OVEJwtPayload {
  const auth = (authorization || "").trim();
  const [scheme, token] = auth.split(" ");
  if (!token || scheme?.toLowerCase() !== "bearer") {
    throw new Error("unauthorized");
  }

  let decoded: unknown;
  try {
    decoded = jwt.verify(token, getOVESecret());
  } catch {
    throw new Error("unauthorized");
  }

  if (
    typeof decoded === "string" ||
    !(decoded as any)?.member_id ||
    !(decoded as any)?.tenant_id
  ) {
    throw new Error("unauthorized");
  }

  return decoded as OVEJwtPayload;
}
