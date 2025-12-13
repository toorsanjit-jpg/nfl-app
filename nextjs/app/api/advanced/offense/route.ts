import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { TeamOffenseRow, AdvancedGroupBy } from "@/types/TeamAdvanced";

type Row = TeamOffenseRow & { season: number | null; week?: number | null };

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const teamId = searchParams.get("teamId"); // optional filter
  const seasonParam = searchParams.get("season"); // optional filter
  const weekParam = searchParams.get("week"); // optional filter
  const groupByRaw = searchParams.get("groupBy");

  const groupBy: AdvancedGroupBy =
    (groupByRaw as AdvancedGroupBy) || "team";

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({
      groupBy,
      season: seasonParam ? Number(seasonParam) : null,
      rows: [] as TeamOffenseRow[],
      _meta: { missingSupabaseEnv: true },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const seasonNumber =
      typeof seasonParam === "string" && !Number.isNaN(Number(seasonParam))
        ? Number(seasonParam)
        : null;
    const weekNumber =
      typeof weekParam === "string" && !Number.isNaN(Number(weekParam))
        ? Number(weekParam)
        : null;

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
      );

    if (teamId) query = query.eq("offense_team", teamId);
    if (seasonNumber != null) query = query.eq("games.season", seasonNumber);
    if (weekNumber != null) query = query.eq("games.week", weekNumber);

    const { data, error } = await query;

    if (error) {
      console.error("advanced/offense db error:", error);
      return NextResponse.json({
        groupBy,
        season: seasonNumber,
        rows: [] as TeamOffenseRow[],
        _meta: { error: error.message },
      });
    }

    const rows = aggregateOffense(data as any as Row[]);

    return NextResponse.json({
      groupBy,
      season: seasonNumber,
      rows,
    });
  } catch (err) {
    console.error("advanced/offense GET error:", err);
    return NextResponse.json({
      groupBy,
      season: seasonParam ? Number(seasonParam) : null,
      rows: [] as TeamOffenseRow[],
      _meta: { error: String(err) },
    });
  }
}

function aggregateOffense(data: Row[]): TeamOffenseRow[] {
  const map = new Map<string, Row[]>();
  for (const row of data) {
    const key = row.offense_team ?? "unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }

  const result: TeamOffenseRow[] = [];

  for (const [teamId, rows] of map.entries()) {
    const plays = rows.length;
    const pass_count = rows.filter((r) => r.calc_is_pass).length;
    const run_count = rows.filter((r) => r.calc_is_run).length;
    const sack_count = rows.filter((r) => r.calc_is_sack).length;
    const scramble_count = rows.filter((r) => r.calc_is_scramble).length;
    const dropbacks = pass_count + sack_count;
    const yards_sum = rows.reduce((sum, r) => sum + (r.result_yards ?? 0), 0);
    const first_downs = rows.filter((r) => r.calc_first_down).length;
    const shotgun_sum = rows.filter((r) => r.calc_shotgun).length;
    const no_huddle_sum = rows.filter((r) => r.calc_no_huddle).length;

    const sack_rate = dropbacks > 0 ? sack_count / dropbacks : 0;
    const scramble_rate = dropbacks > 0 ? scramble_count / dropbacks : 0;
    const success_rate = plays > 0 ? first_downs / plays : 0;
    const shotgun_rate = plays > 0 ? shotgun_sum / plays : 0;
    const no_huddle_rate = plays > 0 ? no_huddle_sum / plays : 0;

    const sample = rows[0];
    result.push({
      team_id: teamId,
      team_name: teamId,
      season: sample.season ?? null,
      games: null,
      plays,
      pass_plays: pass_count,
      run_plays: run_count,
      sacks_taken: sack_count,
      total_yards: yards_sum,
      pass_yards: null,
      rush_yards: null,
      yards_per_play: plays ? yards_sum / plays : null,
      pass_yards_per_game: null,
      rush_yards_per_game: null,
      third_down_att: null,
      third_down_conv: null,
      third_down_pct: null,
      // added derived
      dropbacks,
      rush_attempts: run_count,
      success_rate,
      shotgun_rate,
      no_huddle_rate,
      sack_rate,
      scramble_rate,
    } as TeamOffenseRow & {
      dropbacks: number;
      rush_attempts: number;
      success_rate: number;
      shotgun_rate: number;
      no_huddle_rate: number;
      sack_rate: number;
      scramble_rate: number;
    });
  }

  return result;
}
