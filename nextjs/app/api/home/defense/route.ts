import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ rows: [], _meta: { missingSupabaseEnv: true } });
  }

  const { data, error } = await supabase
    .from("team_defense_base_view")
    .select("*");

  if (error) {
    console.error("home defense error:", error);
    return NextResponse.json({ rows: [] });
  }

  return NextResponse.json({ rows: data || [] });
}
