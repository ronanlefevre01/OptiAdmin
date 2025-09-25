import { NextRequest, NextResponse } from "next/server";
import { q } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { corsHeaders, preflight } from "../_cors";

export async function OPTIONS(req: NextRequest) { return preflight(req); }

export async function GET(req: NextRequest) {
  try {
    const u = requireAuth(req);
    // ... ta logique SQL ...
    const res = NextResponse.json(rows);
    Object.entries(corsHeaders(req)).forEach(([k,v]) => res.headers.set(k, v));
    return res;
  } catch (e:any) {
    const res = NextResponse.json({ error: e?.message || "server_error" },
                                  { status: e?.message === "unauthorized" ? 401 : 500 });
    Object.entries(corsHeaders(req)).forEach(([k,v]) => res.headers.set(k, v));
    return res;
  }
}
