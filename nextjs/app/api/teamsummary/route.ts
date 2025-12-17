import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured", _meta: { missingSupabaseEnv: true } },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);

  const teamId = searchParams.get("teamId");
  const seasonParam = searchParams.get("season");

  if (!teamId) {
    return NextResponse.json(
      { error: "Missing teamId" },
      { status: 400 }
    );
  }

  const season = seasonParam ? Number(seasonParam) : null;

  const { data, error } = await supabase.rpc("fn_team_summary", {
    p_team_id: teamId,
    p_season: season,
  });

  if (error) {
    console.error("fn_team_summary error:", error);
    return NextResponse.json(
      { error: "Failed to load team summary" },
      { status: 500 }
    );
  }

  const row = Array.isArray(data) ? data[0] : data;

  return NextResponse.json({ summary: row ?? null });
}
