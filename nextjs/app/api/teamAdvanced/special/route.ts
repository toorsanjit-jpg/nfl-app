// nextjs/app/api/teamAdvanced/special/route.ts
import { NextResponse } from "next/server";

export type TeamSpecialGroupBy = "total" | "week" | "phase";

export type TeamAdvancedSpecialRow = {
  team_id: string;
  label: string; // e.g. "Totals", "Week 1", "FG", "Punt"
  group_by: TeamSpecialGroupBy;
  group_value: string | null;
  season: number | null;
  games: number | null;

  plays: number | null;

  // Phase-specific yardage, counts, etc. (future)
  fg_att?: number | null;
  fg_made?: number | null;
  punts?: number | null;
  punt_yards?: number | null;
  kick_returns?: number | null;
  kick_return_yards?: number | null;
  punt_returns?: number | null;
  punt_return_yards?: number | null;
};

export type TeamAdvancedSpecialResponse = {
  groupBy: TeamSpecialGroupBy;
  rows: TeamAdvancedSpecialRow[];
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
  const allowed: TeamSpecialGroupBy[] = ["total", "week", "phase"];
  const groupBy: TeamSpecialGroupBy = allowed.includes(
    groupByRaw as TeamSpecialGroupBy
  )
    ? (groupByRaw as TeamSpecialGroupBy)
    : "total";

  const season = searchParams.get("season");
  const phase = searchParams.get("phase");

  const payload: TeamAdvancedSpecialResponse = {
    groupBy,
    rows: [],
  };

  return NextResponse.json({
    ...payload,
    _meta: {
      teamId,
      season,
      phase,
    },
  });
}
