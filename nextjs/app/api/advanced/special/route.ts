import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  applyPlayTypeFilter,
  applyTierFilters,
  parseCommonFilters,
  resolveSeason,
} from "@/lib/advancedFilters";
import { getUserContextFromRequest } from "@/lib/auth";

type Row = {
  offense_team: string | null;
  play_type: string | null;
  calc_play_result: string | null;
  calc_is_pass?: boolean | null;
  calc_is_run?: boolean | null;
  calc_is_sack?: boolean | null;
  calc_shotgun?: boolean | null;
  calc_no_huddle?: boolean | null;
  games: { season: number | null; week: number | null } | null;
};

type SpecialRow = {
  team_id: string;
  team_name: string | null;
  season: number | null;
  week: number | null;
  plays: number;
  punts: number;
  kickoffs: number;
  field_goals: number;
  extra_points: number;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const auth = await getUserContextFromRequest(req);
  const effectiveTier = auth.isAdmin ? "premium" : auth.tier;
  const { seasonInput, filters: parsedFilters } = parseCommonFilters(searchParams);
  const { filters, restricted, reason } = applyTierFilters(parsedFilters, effectiveTier);

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

  if (effectiveTier === "anonymous") {
    return NextResponse.json({
      ...baseResponse,
      season: seasonInput ? Number(seasonInput) : filters.season,
      rows: [] as SpecialRow[],
      _meta: { restricted: true, reason: reason ?? "login-required" },
    });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({
      ...baseResponse,
      season: seasonInput ? Number(seasonInput) : null,
      rows: [] as SpecialRow[],
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
        offense_team,
        play_type,
        calc_play_result,
        calc_is_pass,
        calc_is_run,
        calc_is_sack,
        calc_shotgun,
        calc_no_huddle,
        games!inner(season, week)
      `
      );

    if (resolvedSeason != null) query = query.eq("games.season", resolvedSeason);
    if (filters.week != null) query = query.eq("games.week", filters.week);
    if (filters.shotgun) query = query.eq("calc_shotgun", true);
    if (filters.noHuddle) query = query.eq("calc_no_huddle", true);
    query = applyPlayTypeFilter(query, filters.playType);

    const { data, error } = await query;

    if (error) {
      console.error("advanced/special db error:", error);
      return NextResponse.json({
        ...baseResponse,
        season: resolvedSeason,
        rows: [] as SpecialRow[],
        _meta: {
          error: error.message,
          ...meta,
        },
      });
    }

    const rows = aggregateSpecial(data as any as Row[]);

    return NextResponse.json({
      ...baseResponse,
      season: resolvedSeason,
      rows,
      ...(Object.keys(meta).length ? { _meta: meta } : {}),
    });
  } catch (err) {
    console.error("advanced/special GET error:", err);
    return NextResponse.json({
      ...baseResponse,
      season: seasonInput ? Number(seasonInput) : null,
      rows: [] as SpecialRow[],
      _meta: {
        error: String(err),
        ...(restricted ? { restricted: true, reason } : {}),
      },
    });
  }
}

function aggregateSpecial(data: Row[]): SpecialRow[] {
  const grouped = new Map<string, Row[]>();
  for (const row of data) {
    const key = row.offense_team ?? "unknown";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(row);
  }

  const results: SpecialRow[] = [];

  for (const [teamId, rows] of grouped.entries()) {
    const playTypeToLower = (value: string | null) =>
      (value ?? "").toLowerCase();

    const plays = rows.length;
    const punts = rows.filter(
      (r) =>
        playTypeToLower(r.calc_play_result) === "punt" ||
        playTypeToLower(r.play_type).includes("punt")
    ).length;
    const kickoffs = rows.filter(
      (r) =>
        playTypeToLower(r.calc_play_result) === "kick" ||
        playTypeToLower(r.play_type).includes("kickoff")
    ).length;
    const field_goals = rows.filter((r) =>
      playTypeToLower(r.play_type).includes("field goal")
    ).length;
    const extra_points = rows.filter((r) =>
      playTypeToLower(r.play_type).includes("extra point")
    ).length;

    const sample = rows[0];
    results.push({
      team_id: teamId,
      team_name: teamId,
      season: sample?.games?.season ?? null,
      week: sample?.games?.week ?? null,
      plays,
      punts,
      kickoffs,
      field_goals,
      extra_points,
    });
  }

  return results;
}
