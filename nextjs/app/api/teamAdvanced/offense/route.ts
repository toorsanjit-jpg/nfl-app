// nextjs/app/api/teamAdvanced/offense/route.ts
import { NextResponse } from "next/server";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type {
  TeamAdvancedOffenseResponse,
  TeamOffenseGroupBy,
  TeamAdvancedOffenseRow,
} from "@/types/TeamAdvancedOffense";

type Row = {
  offense_team: string;
  result_yards: number | null;
  calc_is_pass: boolean | null;
  calc_is_run: boolean | null;
  calc_is_sack: boolean | null;
  calc_is_scramble: boolean | null;
  calc_shotgun: boolean | null;
  calc_no_huddle: boolean | null;
  calc_first_down: boolean | null;
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

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({
      groupBy,
      rows: [] as TeamAdvancedOffenseRow[],
      _meta: { missingSupabaseEnv: true },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const season = searchParams.get("season");
    const week = searchParams.get("week");
    const playResult = searchParams.get("playResult");
    const shotgun = searchParams.get("shotgun");
    const noHuddle = searchParams.get("noHuddle");

    let query = supabase
      .from("nfl_plays")
      .select(
        `
        offense_team,
        result_yards,
        calc_is_pass,
        calc_is_run,
        calc_is_sack,
        calc_is_scramble,
        calc_shotgun,
        calc_no_huddle,
        calc_first_down,
        games!inner(season, week)
      `
      )
      .eq("offense_team", teamId);

    if (season) query = query.eq("games.season", Number(season));
    if (week) query = query.eq("games.week", Number(week));
    if (shotgun === "true") query = query.eq("calc_shotgun", true);
    if (noHuddle === "true") query = query.eq("calc_no_huddle", true);
    if (playResult === "pass") query = query.eq("calc_is_pass", true);
    if (playResult === "run") query = query.eq("calc_is_run", true);
    if (playResult === "sack") query = query.eq("calc_is_sack", true);

    const { data, error } = await query;
    if (error) {
      console.error("teamAdvanced/offense error:", error);
      return NextResponse.json({
        groupBy,
        rows: [] as TeamAdvancedOffenseRow[],
        _meta: { error: error.message },
      });
    }

    const rows = aggregateTeamOffense(data as any as Row[]);

    return NextResponse.json({
      groupBy,
      rows,
    });
  } catch (err) {
    console.error("teamAdvanced/offense GET error:", err);
    return NextResponse.json({
      groupBy,
      rows: [] as TeamAdvancedOffenseRow[],
      _meta: { error: String(err) },
    });
  }
}

function aggregateTeamOffense(data: Row[]): TeamAdvancedOffenseRow[] {
  const grouped = new Map<string, Row[]>();
  for (const row of data) {
    const label =
      row.games?.week != null ? `Week ${row.games.week}` : row.offense_team;
    const key = label ?? "Totals";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  const result: TeamAdvancedOffenseRow[] = [];

  for (const [key, rows] of grouped.entries()) {
    const plays = rows.length;
    const pass_count = rows.filter((r) => r.calc_is_pass).length;
    const run_count = rows.filter((r) => r.calc_is_run).length;
    const sack_count = rows.filter((r) => r.calc_is_sack).length;
    const scramble_count = rows.filter((r) => r.calc_is_scramble).length;
    const dropbacks = pass_count + sack_count;
    const yards_sum = rows.reduce((s, r) => s + (r.result_yards ?? 0), 0);
    const first_downs = rows.filter((r) => r.calc_first_down).length;
    const shotgun_sum = rows.filter((r) => r.calc_shotgun).length;
    const no_huddle_sum = rows.filter((r) => r.calc_no_huddle).length;

    const season = rows[0]?.games?.season ?? null;
    const week = rows[0]?.games?.week ?? null;

    result.push({
      team_id: rows[0]?.offense_team ?? "unknown",
      label: key,
      group_by: "week",
      group_value: week ? String(week) : null,
      season,
      games: null,
      plays,
      pass_plays: pass_count,
      run_plays: run_count,
      sacks_taken: sack_count,
      total_yards: yards_sum,
      pass_yards: null,
      rush_yards: null,
      yards_per_play: plays ? yards_sum / plays : null,
      success_rate: plays ? first_downs / plays : 0,
      dropbacks,
      rush_attempts: run_count,
      shotgun_rate: plays ? shotgun_sum / plays : 0,
      no_huddle_rate: plays ? no_huddle_sum / plays : 0,
      sack_rate: dropbacks ? sack_count / dropbacks : 0,
      scramble_rate: dropbacks ? scramble_count / dropbacks : 0,
    });
  }

  return result;
}
