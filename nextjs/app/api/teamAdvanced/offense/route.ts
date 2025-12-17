// nextjs/app/api/teamAdvanced/offense/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type {
  TeamAdvancedOffenseResponse,
  TeamOffenseGroupBy,
  TeamAdvancedOffenseRow,
} from "@/types/TeamAdvancedOffense";
import {
  applyPlayTypeFilter,
  applyTierFilters,
  parseCommonFilters,
  resolveSeason,
} from "@/lib/advancedFilters";
import { getUserContextFromRequest } from "@/lib/auth";

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

  const auth = await getUserContextFromRequest(req);
  const { seasonInput, filters: parsedFilters } = parseCommonFilters(searchParams);
  const { filters, restricted, reason } = applyTierFilters(parsedFilters, auth.tier);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({
      groupBy,
      season: seasonInput ? Number(seasonInput) : null,
      week: filters.week,
      filters: {
        playType: filters.playType,
        shotgun: filters.shotgun,
        noHuddle: filters.noHuddle,
      },
      rows: [] as TeamAdvancedOffenseRow[],
      _meta: { missingSupabaseEnv: true },
    });
  }

  if (auth.tier !== "premium") {
    return NextResponse.json(
      {
        groupBy,
        season: filters.season ?? (seasonInput ? Number(seasonInput) : null),
        week: filters.week,
        filters: {
          playType: filters.playType,
          shotgun: filters.shotgun,
          noHuddle: filters.noHuddle,
        },
        rows: [] as TeamAdvancedOffenseRow[],
        _meta: {
          restricted: true,
          reason: auth.userId ? "premium-required" : "login-required",
        },
      },
      { status: auth.userId ? 403 : 401 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { season: resolvedSeason, metaError } = await resolveSeason(
      supabase,
      filters.season
    );
    const meta: Record<string, any> = {};
    if (metaError) meta.seasonLookupError = metaError;

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

    query = query.eq("offense_team", teamId);

    if (resolvedSeason != null) query = query.eq("games.season", resolvedSeason);
    if (filters.week != null) query = query.eq("games.week", filters.week);
    if (filters.shotgun) query = query.eq("calc_shotgun", true);
    if (filters.noHuddle) query = query.eq("calc_no_huddle", true);
    query = applyPlayTypeFilter(query, filters.playType);

    const { data, error } = await query;
    if (error) {
      console.error("teamAdvanced/offense error:", error);
      return NextResponse.json({
        groupBy,
        season: resolvedSeason ?? filters.season ?? (seasonInput ? Number(seasonInput) : null),
        week: filters.week,
        filters: {
          playType: filters.playType,
        shotgun: filters.shotgun,
        noHuddle: filters.noHuddle,
      },
      rows: [] as TeamAdvancedOffenseRow[],
      _meta: {
        error: error.message,
        ...meta,
      },
    });
  }

  const rows = aggregateTeamOffense(data as any as Row[]);

    return NextResponse.json({
      groupBy,
      season: resolvedSeason,
      week: filters.week,
      filters: {
        playType: filters.playType,
        shotgun: filters.shotgun,
        noHuddle: filters.noHuddle,
      },
      rows,
      ...(Object.keys(meta).length ? { _meta: meta } : {}),
    });
  } catch (err) {
    console.error("teamAdvanced/offense GET error:", err);
    return NextResponse.json({
      groupBy,
      season: seasonInput ? Number(seasonInput) : filters.season,
      week: filters.week,
      filters: {
        playType: filters.playType,
        shotgun: filters.shotgun,
        noHuddle: filters.noHuddle,
      },
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
