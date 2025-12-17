// nextjs/app/api/teamAdvanced/special/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  applyPlayTypeFilter,
  applyTierFilters,
  parseCommonFilters,
  resolveSeason,
} from "@/lib/advancedFilters";
import { getUserContextFromRequest } from "@/lib/auth";

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
  kickoff_plays?: number | null;
  xp_att?: number | null;
  st_plays_total?: number | null;
};

export type TeamAdvancedSpecialResponse = {
  groupBy: TeamSpecialGroupBy;
  season: number | null;
  week: number | null;
  filters: {
    playType: string;
    shotgun: boolean;
    noHuddle: boolean;
  };
  rows: TeamAdvancedSpecialRow[];
  _meta?: {
    missingSupabaseEnv?: true;
    error?: string;
    seasonLookupError?: string;
    restricted?: boolean;
    reason?: string;
  };
};

type Row = {
  offense_team: string;
  defense_team: string;
  calc_play_result: string | null;
  play_type: string | null;
  calc_is_pass?: boolean | null;
  calc_is_run?: boolean | null;
  calc_is_sack?: boolean | null;
  calc_shotgun?: boolean | null;
  calc_no_huddle?: boolean | null;
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
  const allowed: TeamSpecialGroupBy[] = ["total", "week", "phase"];
  const groupBy: TeamSpecialGroupBy = allowed.includes(
    groupByRaw as TeamSpecialGroupBy
  )
    ? (groupByRaw as TeamSpecialGroupBy)
    : "total";

  const auth = await getUserContextFromRequest(req);
  const effectiveTier = auth.isAdmin ? "premium" : auth.tier;
  const { seasonInput, filters: parsedFilters } = parseCommonFilters(searchParams);
  const { filters, restricted, reason } = applyTierFilters(parsedFilters, effectiveTier);
  const phase = searchParams.get("phase");

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
      rows: [] as TeamAdvancedSpecialRow[],
      _meta: { missingSupabaseEnv: true },
    });
  }

  if (effectiveTier !== "premium") {
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
        rows: [] as TeamAdvancedSpecialRow[],
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
        defense_team,
        calc_play_result,
        play_type,
        calc_is_pass,
        calc_is_run,
        calc_is_sack,
        calc_shotgun,
        calc_no_huddle,
        games!inner(season, week)
      `
      )
      .or(`offense_team.eq.${teamId},defense_team.eq.${teamId}`);

    if (resolvedSeason != null) query = query.eq("games.season", resolvedSeason);
    if (filters.week != null) query = query.eq("games.week", filters.week);
    if (filters.shotgun) query = query.eq("calc_shotgun", true);
    if (filters.noHuddle) query = query.eq("calc_no_huddle", true);
    if (phase) query = query.eq("calc_play_result", phase);
    query = applyPlayTypeFilter(query, filters.playType);

    const { data, error } = await query;
    if (error) {
      console.error("teamAdvanced/special error:", error);
      return NextResponse.json({
        groupBy,
        season: resolvedSeason ?? filters.season ?? (seasonInput ? Number(seasonInput) : null),
        week: filters.week,
        filters: {
          playType: filters.playType,
          shotgun: filters.shotgun,
        noHuddle: filters.noHuddle,
      },
      rows: [] as TeamAdvancedSpecialRow[],
      _meta: {
        error: error.message,
        ...meta,
      },
    });
  }

  const rows = aggregateTeamSpecial(teamId, data as any as Row[], groupBy);

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
    console.error("teamAdvanced/special GET error:", err);
    return NextResponse.json({
      groupBy,
      season: seasonInput ? Number(seasonInput) : filters.season,
      week: filters.week,
      filters: {
        playType: filters.playType,
        shotgun: filters.shotgun,
        noHuddle: filters.noHuddle,
      },
      rows: [] as TeamAdvancedSpecialRow[],
      _meta: { error: String(err) },
    });
  }
}

function aggregateTeamSpecial(
  teamId: string,
  data: Row[],
  groupBy: TeamSpecialGroupBy
): TeamAdvancedSpecialRow[] {
  const grouped = new Map<string, Row[]>();
  for (const row of data) {
    const bucket =
      groupBy === "week"
        ? `Week ${row.games?.week ?? "-"}`
        : groupBy === "phase"
        ? row.calc_play_result ?? "unknown"
        : "Totals";
    if (!grouped.has(bucket)) grouped.set(bucket, []);
    grouped.get(bucket)!.push(row);
  }

  const rows: TeamAdvancedSpecialRow[] = [];

  for (const [bucket, list] of grouped.entries()) {
    const plays = list.length;
    const season = list[0]?.games?.season ?? null;
    const week = list[0]?.games?.week ?? null;

    const toLower = (val: string | null) => (val ?? "").toLowerCase();
    const fg_att = list.filter((r) =>
      toLower(r.play_type).includes("field goal")
    ).length;
    const punts = list.filter((r) => toLower(r.calc_play_result) === "punt")
      .length;
    const kickoffs = list.filter(
      (r) =>
        toLower(r.calc_play_result) === "kick" ||
        toLower(r.play_type).includes("kickoff")
    ).length;
    const xp_att = list.filter((r) =>
      toLower(r.play_type).includes("extra point")
    ).length;

    rows.push({
      team_id: teamId,
      label: bucket,
      group_by: groupBy,
      group_value:
        groupBy === "week"
          ? week != null
            ? String(week)
            : null
          : groupBy === "phase"
          ? bucket
          : null,
      season,
      games: null,
      plays,
      fg_att,
      fg_made: null,
      punts,
      punt_yards: null,
      kick_returns: null,
      kick_return_yards: null,
      punt_returns: null,
      punt_return_yards: null,
      kickoff_plays: kickoffs,
      xp_att,
      st_plays_total: plays,
    } as any);
  }

  return rows;
}
