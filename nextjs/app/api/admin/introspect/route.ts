import { NextRequest, NextResponse } from "next/server";
import { introspectColumns } from "@/lib/supabaseIntrospect";
import { requireAdminApi } from "@/lib/adminApi";

export async function GET(req: NextRequest) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;

  const { searchParams } = new URL(req.url);
  const table = searchParams.get("table") || "nfl_plays";

  const result = await introspectColumns(table);
  return NextResponse.json(result);
}
