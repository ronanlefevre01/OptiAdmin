// shim de compatibilité : expose requireJwt (et signJwt si nécessaire) depuis jwtOVE
export { requireJwtOVE as requireJwt, signJwtOVE as signJwt } from "./jwtOVE";
