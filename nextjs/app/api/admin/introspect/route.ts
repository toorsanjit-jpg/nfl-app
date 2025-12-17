import { NextRequest, NextResponse } from "next/server";
import { introspectColumns } from "@/lib/supabaseIntrospect";
import { getUserContextFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const auth = await getUserContextFromRequest(req);
  if (!auth.userId) {
    return NextResponse.json(
      { columns: [], _meta: { restricted: true, reason: "login-required" } },
      { status: 401 }
    );
  }
  if (!auth.isAdmin || !auth.isPremium) {
    return NextResponse.json(
      { columns: [], _meta: { restricted: true, reason: "admin-required" } },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table") || "nfl_plays";

  const result = await introspectColumns(table);
  return NextResponse.json(result);
}
