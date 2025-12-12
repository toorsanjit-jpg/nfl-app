// nextjs/app/api/teamAdvanced/defense/route.ts
import { NextResponse } from "next/server";

export type TeamDefenseGroupBy = "total" | "week" | "quarter";

export type TeamAdvancedDefenseRow = {
  team_id: string;
  label: string;
  group_by: TeamDefenseGroupBy;
  group_value: string | null;
  season: number | null;
  games: number | null;

  plays_defended: number | null;
  pass_plays_defended: number | null;
  run_plays_defended: number | null;

  yards_allowed: number | null;
  pass_yards_allowed: number | null;
  rush_yards_allowed: number | null;
  yards_per_play_allowed: number | null;

  success_rate_allowed?: number | null;
  epa_per_play_allowed?: number | null;
};

export type TeamAdvancedDefenseResponse = {
  groupBy: TeamDefenseGroupBy;
  rows: TeamAdvancedDefenseRow[];
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json(
      { error: "Missing teamId" },
      { status: 400 }
    );
  }

  const groupByRaw = searchParams.get("groupBy") ?? "total";
  const allowed: TeamDefenseGroupBy[] = ["total", "week", "quarter"];
  const groupBy: TeamDefenseGroupBy = allowed.includes(
    groupByRaw as TeamDefenseGroupBy
  )
    ? (groupByRaw as TeamDefenseGroupBy)
    : "total";

  const season = searchParams.get("season");
  const down = searchParams.get("down");
  const quarter = searchParams.get("quarter");
  const playResult = searchParams.get("playResult");

  const payload: TeamAdvancedDefenseResponse = {
    groupBy,
    rows: [],
  };

  return NextResponse.json({
    ...payload,
    _meta: {
      teamId,
      season,
      down,
      quarter,
      playResult,
    },
  });
}
