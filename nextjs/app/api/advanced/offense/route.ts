// nextjs/app/api/advanced/offense/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const season = searchParams.get("season");
  const groupBy = searchParams.get("groupBy") || "total";

  try {
    // Typed query
    let query = supabase
      .from("team_offense_summary")
      .select("*")
      .returns<TeamOffenseRow[]>();   // ← IMPORTANT FIX

    if (season) {
      query = query.eq("season", Number(season));
    }

    const { data, error } = await query;

    if (error) {
      console.error("team_offense_summary error:", error);
      return NextResponse.json(
        { error: "db_error", details: error.message },
        { status: 500 }
      );
    }

    // Ensure rows is ALWAYS an array of valid objects
    return NextResponse.json({
      groupBy,
      season,
      rows: Array.isArray(data) ? data : [],
    });
  } catch (err: any) {
    console.error("advanced/offense GET error:", err);

    return NextResponse.json(
      { error: "server_error", details: err.message },
      { status: 500 }
    );
  }
}
