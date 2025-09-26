import jwt from "jsonwebtoken";

const SECRET = (process.env.OVE_JWT_SECRET || "").trim();
if (!SECRET) {
  // On échoue tôt et clairement si la variable n'est pas définie
  throw new Error("ove_jwt_secret_missing");
}

export function requireJwtOVE(auth?: string) {
  const token = String(auth || "").replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    const e = new Error("unauthorized") as any;
    e.status = 401;
    throw e;
  }
  try {
    return jwt.verify(token, SECRET) as {
      tenant_id: string;
      member_id: string;
      role: string;
      iat: number;
      exp: number;
    };
  } catch {
    const e = new Error("unauthorized") as any;
    e.status = 401;
    throw e;
  }
}

export function signJwtOVE(payload: object, expiresIn: string = "7d") {
  return jwt.sign(payload, SECRET, { expiresIn });
}
