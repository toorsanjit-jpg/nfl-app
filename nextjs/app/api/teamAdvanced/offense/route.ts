// nextjs/app/api/teamAdvanced/offense/route.ts
import { NextResponse } from "next/server";
import type {
  TeamAdvancedOffenseResponse,
  TeamOffenseGroupBy,
} from "@/types/TeamAdvancedOffense";

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
  const allowed: TeamOffenseGroupBy[] = [
    "total",
    "week",
    "quarter",
    "qb",
    "rb",
  ];
  const groupBy: TeamOffenseGroupBy = allowed.includes(
    groupByRaw as TeamOffenseGroupBy
  )
    ? (groupByRaw as TeamOffenseGroupBy)
    : "total";

  // Filters (for now, just read & reflect; no real DB query yet)
  const season = searchParams.get("season");
  const down = searchParams.get("down");
  const quarter = searchParams.get("quarter");
  const playResult = searchParams.get("playResult");

  // TODO (later): implement real Supabase query over nfl_plays with grouping
  // For now, return a valid empty payload so UI can be built safely.
  const payload: TeamAdvancedOffenseResponse = {
    groupBy,
    rows: [],
  };

  return NextResponse.json({
    ...payload,
    // Echo filters so we can inspect in logs later if needed.
    _meta: {
      teamId,
      season,
      down,
      quarter,
      playResult,
    },
  });
}
