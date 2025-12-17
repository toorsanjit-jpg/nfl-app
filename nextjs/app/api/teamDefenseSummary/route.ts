import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabaseServer";

export type TeamDefenseSummaryRow = {
  team_id: string;
  team_name: string | null;
  season: number | null;
  games: number | null;
  plays_defended: number | null;
  pass_plays_defended: number | null;
  run_plays_defended: number | null;
  sacks_made: number | null;
  yards_allowed: number | null;
  pass_yards_allowed: number | null;
  rush_yards_allowed: number | null;
  yards_per_play_allowed: number | null;
  pass_yards_per_game_allowed: number | null;
  rush_yards_per_game_allowed: number | null;
  third_down_att_def: number | null;
  third_down_conv_def: number | null;
  third_down_pct_def: number | null;
};

export async function GET(req: Request) {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase is not configured", _meta: { missingSupabaseEnv: true } },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json({ error: "Missing teamId" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("team_defense_view")
    .select("*")
    .eq("team_id", teamId)
    .maybeSingle();

  if (error) {
    console.error("Defense view error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const summary = (data as TeamDefenseSummaryRow | null) ?? null;

  return NextResponse.json({ summary });
}
