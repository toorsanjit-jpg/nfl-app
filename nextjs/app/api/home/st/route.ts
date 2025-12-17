import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ rows: [], _meta: { missingSupabaseEnv: true } });
  }

  const { data, error } = await supabase.rpc("fn_team_special_summary_all");

  if (error) {
    console.error("home special teams error:", error);
    return NextResponse.json({ rows: [] });
  }

  return NextResponse.json({ rows: data || [] });
}
