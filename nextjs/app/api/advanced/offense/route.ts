// nextjs/app/api/advanced/offense/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export type TeamOffenseRow = {
  team_id: string;
  team_name: string | null;
  season: number | null;
  games: number | null;
  plays: number | null;
  pass_plays: number | null;
  run_plays: number | null;
  sacks_taken: number | null;
  total_yards: number | null;
  pass_yards: number | null;
  rush_yards: number | null;
  yards_per_play: number | null;
  pass_yards_per_game: number | null;
  rush_yards_per_game: number | null;
  third_down_att: number | null;
  third_down_conv: number | null;
  third_down_pct: number | null;
};

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const seasonParam = url.searchParams.get("season");
    const groupBy = url.searchParams.get("groupBy") ?? "totals"; // reserved for future

    const season = seasonParam ? Number(seasonParam) : null;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    let query = supabase
      .from("team_offense_summary")
      .select<TeamOffenseRow>(
        [
          "team_id",
          "team_name",
          "season",
          "games",
          "plays",
          "pass_plays",
          "run_plays",
          "sacks_taken",
          "total_yards",
          "pass_yards",
          "rush_yards",
          "yards_per_play",
          "pass_yards_per_game",
          "rush_yards_per_game",
          "third_down_att",
          "third_down_conv",
          "third_down_pct",
        ].join(",")
      )
      .order("total_yards", { ascending: false });

    if (season != null && !Number.isNaN(season)) {
      query = query.eq("season", season);
    }

    const { data, error } = await query;

    if (error) {
      console.error("team_offense_summary error:", error);
      return NextResponse.json(
        { error: "db_error", details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      groupBy,
      season,
      rows: data ?? [],
    });
  } catch (err: any) {
    console.error("advanced/offense GET error:", err);
    return NextResponse.json(
      {
        error: "unexpected_error",
        details: String(err?.message ?? err),
      },
      { status: 500 }
    );
  }
}
