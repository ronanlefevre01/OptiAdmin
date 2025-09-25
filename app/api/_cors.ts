import { NextRequest, NextResponse } from "next/server";

const allowList = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

export function corsHeaders(req: NextRequest) {
  const origin = req.headers.get("origin") || "*";
  const allowed =
    allowList.includes("*") || allowList.includes(origin)
      ? origin
      : allowList[0] || "*";

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

export function preflight(req: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(req) });
}
