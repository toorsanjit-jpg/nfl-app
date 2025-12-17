import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { TeamDefenseRow } from "@/types/TeamAdvanced";
import {
  applyPlayTypeFilter,
  applyTierFilters,
  parseCommonFilters,
  resolveSeason,
} from "@/lib/advancedFilters";
import { getUserContextFromRequest } from "@/lib/auth";

type Row = TeamDefenseRow & {
  defense_team?: string | null;
  season: number | null;
  week?: number | null;
  result_yards?: number | null;
  calc_is_pass?: boolean | null;
  calc_is_run?: boolean | null;
  calc_is_sack?: boolean | null;
  calc_is_int?: boolean | null;
  calc_stop?: boolean | null;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const teamId = searchParams.get("teamId"); // optional
  const auth = await getUserContextFromRequest(req);
  const { seasonInput, filters: parsedFilters } = parseCommonFilters(searchParams);
  const { filters, restricted, reason } = applyTierFilters(parsedFilters, auth.tier);

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const baseResponse = {
    season: filters.season,
    week: filters.week,
    filters: {
      playType: filters.playType,
      shotgun: filters.shotgun,
      noHuddle: filters.noHuddle,
    },
  };

  if (auth.tier === "anonymous") {
    return NextResponse.json({
      ...baseResponse,
      season: seasonInput ? Number(seasonInput) : filters.season,
      rows: [] as TeamDefenseRow[],
      _meta: { restricted: true, reason: reason ?? "login-required" },
    });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({
      ...baseResponse,
      season: seasonInput ? Number(seasonInput) : null,
      rows: [] as TeamDefenseRow[],
      _meta: {
        missingSupabaseEnv: true,
        ...(restricted ? { restricted: true, reason } : {}),
      },
    });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { season: resolvedSeason, metaError } = await resolveSeason(
      supabase,
      filters.season
    );
    const meta: Record<string, any> = {};
    if (metaError) meta.seasonLookupError = metaError;
    if (restricted) {
      meta.restricted = true;
      if (reason) meta.reason = reason;
    }

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
      );

    if (teamId) query = query.eq("defense_team", teamId);
    if (resolvedSeason != null) query = query.eq("games.season", resolvedSeason);
    if (filters.week != null) query = query.eq("games.week", filters.week);
    if (filters.shotgun) query = query.eq("calc_shotgun", true);
    if (filters.noHuddle) query = query.eq("calc_no_huddle", true);
    query = applyPlayTypeFilter(query, filters.playType);

    const { data, error } = await query;

    if (error) {
      console.error("advanced/defense db error:", error);
      return NextResponse.json({
        ...baseResponse,
        season: resolvedSeason,
        rows: [] as TeamDefenseRow[],
        _meta: {
          error: error.message,
          ...meta,
        },
      });
    }

    const rows = aggregateDefense(data as any as Row[]);

    return NextResponse.json({
      ...baseResponse,
      season: resolvedSeason,
      rows,
      ...(Object.keys(meta).length ? { _meta: meta } : {}),
    });
  } catch (err) {
    console.error("advanced/defense GET error:", err);
    return NextResponse.json({
      ...baseResponse,
      season: seasonInput ? Number(seasonInput) : null,
      rows: [] as TeamDefenseRow[],
      _meta: {
        error: String(err),
        ...(restricted ? { restricted: true, reason } : {}),
      },
    });
  }
}

function aggregateDefense(data: Row[]): TeamDefenseRow[] {
  const map = new Map<string, Row[]>();
  for (const row of data) {
    const key = row.defense_team ?? "unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(row);
  }

  const result: TeamDefenseRow[] = [];

  for (const [teamId, rows] of map.entries()) {
    const plays = rows.length;
    const pass_count = rows.filter((r) => r.calc_is_pass).length;
    const run_count = rows.filter((r) => r.calc_is_run).length;
    const sacks = rows.filter((r) => r.calc_is_sack).length;
    const ints = rows.filter((r) => r.calc_is_int).length;
    const stops = rows.filter((r) => r.calc_stop).length;
    const explosive_allowed = rows.filter(
      (r) => typeof r.result_yards === "number" && r.result_yards >= 20
    ).length;
    const yards_allowed = rows.reduce(
      (sum, r) => sum + (r.result_yards ?? 0),
      0
    );

    const dropbacks = pass_count + sacks;
    const sack_rate = dropbacks > 0 ? sacks / dropbacks : 0;
    const stop_rate = plays > 0 ? stops / plays : 0;
    const pressure_proxy = sacks; // qb hits not available in schema; fallback to sacks only

    const sample = rows[0];
    result.push({
      team_id: teamId,
      team_name: teamId,
      season: sample.season ?? null,
      games: null,
      plays_defended: plays,
      pass_plays_defended: pass_count,
      run_plays_defended: run_count,
      sacks_made: sacks,
      yards_allowed,
      pass_yards_allowed: null,
      rush_yards_allowed: null,
      yards_per_play_allowed: plays ? yards_allowed / plays : null,
      pass_yards_per_game_allowed: null,
      rush_yards_per_game_allowed: null,
      third_down_att_def: null,
      third_down_conv_def: null,
      third_down_pct_def: null,
      qb_hits: 0,
      ints,
      touchdowns_allowed: null,
      stops,
      explosive_allowed_pass: explosive_allowed,
      explosive_allowed_run: 0,
      pressure_proxy,
      sack_rate,
      stop_rate,
    } as TeamDefenseRow & {
      qb_hits: number;
      ints: number;
      touchdowns_allowed: number | null;
      stops: number;
      explosive_allowed_pass: number;
      explosive_allowed_run: number;
      pressure_proxy: number;
      sack_rate: number;
      stop_rate: number;
    });
  }

  return result;
}
