import jwt, { SignOptions, Secret } from "jsonwebtoken";

const SECRET = (process.env.JWT_SECRET || "dev-secret") as Secret;

export type AuthUser = { tenant_id: string; member_id: string; role?: string };

export const signJwt = (p: AuthUser, exp: string | number = "7d") =>
  jwt.sign(p, SECRET, { expiresIn: exp } as SignOptions);

export function requireJwt(auth?: string): AuthUser {
  const t = (auth || "").startsWith("Bearer ") ? auth!.slice(7) : "";
  if (!t) throw new Error("unauthorized");
  return jwt.verify(t, SECRET) as AuthUser;
}
