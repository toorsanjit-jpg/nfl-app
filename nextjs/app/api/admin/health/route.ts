import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { getUserContextFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const auth = await getUserContextFromRequest(req);
  const hasServiceRole = Boolean(getSupabaseAdminClient());

  return NextResponse.json({
    ok: true,
    isAuthenticated: Boolean(auth.userId),
    isAdmin: Boolean(auth.isAdmin),
    hasServiceRole,
  });
}
