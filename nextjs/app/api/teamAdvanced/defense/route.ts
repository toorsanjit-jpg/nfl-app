// nextjs/app/api/teamAdvanced/defense/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

  pressure_proxy?: number | null;
  sack_rate?: number | null;
  stop_rate?: number | null;
  turnovers?: number | null;
  explosives_allowed?: number | null;
};

export type TeamAdvancedDefenseResponse = {
  groupBy: TeamDefenseGroupBy;
  rows: TeamAdvancedDefenseRow[];
};

type Row = {
  defense_team: string;
  result_yards: number | null;
  calc_is_pass: boolean | null;
  calc_is_run: boolean | null;
  calc_is_sack: boolean | null;
  calc_is_int: boolean | null;
  calc_stop: boolean | null;
  games: { season: number | null; week: number | null } | null;
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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({
      groupBy,
      rows: [] as TeamAdvancedDefenseRow[],
      _meta: { missingSupabaseEnv: true },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const season = searchParams.get("season");
    const week = searchParams.get("week");
    const playResult = searchParams.get("playResult");

    let query = supabase
      .from("nfl_plays")
      .select(
        `
        defense_team,
        result_yards,
        calc_is_pass,
        calc_is_run,
        calc_is_sack,
        calc_is_int,
        calc_stop,
        games!inner(season, week)
      `
      )
      .eq("defense_team", teamId);

    if (season) query = query.eq("games.season", Number(season));
    if (week) query = query.eq("games.week", Number(week));
    if (playResult === "pass") query = query.eq("calc_is_pass", true);
    if (playResult === "run") query = query.eq("calc_is_run", true);
    if (playResult === "sack") query = query.eq("calc_is_sack", true);

    const { data, error } = await query;
    if (error) {
      console.error("teamAdvanced/defense error:", error);
      return NextResponse.json({
        groupBy,
        rows: [] as TeamAdvancedDefenseRow[],
        _meta: { error: error.message },
      });
    }

    const rows = aggregateTeamDefense(data as any as Row[]);

    return NextResponse.json({
      groupBy,
      rows,
    });
  } catch (err) {
    console.error("teamAdvanced/defense GET error:", err);
    return NextResponse.json({
      groupBy,
      rows: [] as TeamAdvancedDefenseRow[],
      _meta: { error: String(err) },
    });
  }
}

function aggregateTeamDefense(data: Row[]): TeamAdvancedDefenseRow[] {
  const grouped = new Map<string, Row[]>();
  for (const row of data) {
    const label =
      row.games?.week != null ? `Week ${row.games.week}` : row.defense_team;
    const key = label ?? "Totals";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  const result: TeamAdvancedDefenseRow[] = [];

  for (const [key, rows] of grouped.entries()) {
    const plays = rows.length;
    const pass_count = rows.filter((r) => r.calc_is_pass).length;
    const run_count = rows.filter((r) => r.calc_is_run).length;
    const sacks = rows.filter((r) => r.calc_is_sack).length;
    const ints = rows.filter((r) => r.calc_is_int).length;
    const stops = rows.filter((r) => r.calc_stop).length;
    const explosive = rows.filter(
      (r) => typeof r.result_yards === "number" && r.result_yards >= 20
    ).length;
    const yards_allowed = rows.reduce(
      (s, r) => s + (r.result_yards ?? 0),
      0
    );
    const dropbacks = pass_count + sacks;
    const sack_rate = dropbacks ? sacks / dropbacks : 0;
    const stop_rate = plays ? stops / plays : 0;
    const pressure_proxy = sacks; // qb hits not available

    const season = rows[0]?.games?.season ?? null;
    const week = rows[0]?.games?.week ?? null;

    result.push({
      team_id: rows[0]?.defense_team ?? "unknown",
      label: key,
      group_by: "week",
      group_value: week ? String(week) : null,
      season,
      games: null,
      plays_defended: plays,
      pass_plays_defended: pass_count,
      run_plays_defended: run_count,
      yards_allowed,
      pass_yards_allowed: null,
      rush_yards_allowed: null,
      yards_per_play_allowed: plays ? yards_allowed / plays : null,
      pressure_proxy,
      sack_rate,
      stop_rate,
      turnovers: ints,
      explosives_allowed: explosive,
    });
  }

  return result;
}
