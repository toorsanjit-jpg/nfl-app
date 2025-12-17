// app/api/homepage/defense/route.ts
import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ data: [], _meta: { missingSupabaseEnv: true } });
  }

  const { data, error } = await supabase.from("homepage_team_defense").select("*");

  if (error) {
    console.error("homepage_team_defense error", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
