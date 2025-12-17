// Shared helpers for advanced endpoints and filter parsing.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserTier } from "./userTier";

export type CommonFilters = {
  season: number | null;
  week: number | null;
  playType: "all" | "pass" | "run" | "sack";
  shotgun: boolean;
  noHuddle: boolean;
};

export const DEFAULT_FILTERS: CommonFilters = {
  season: null,
  week: null,
  playType: "all",
  shotgun: false,
  noHuddle: false,
};

export function parseCommonFilters(searchParams: URLSearchParams) {
  const seasonInput = searchParams.get("season");
  const weekInput = searchParams.get("week");
  const playTypeInput = searchParams.get("playType") ?? "all";
  const shotgunInput = searchParams.get("shotgun") ?? "false";
  const noHuddleInput = searchParams.get("noHuddle") ?? "false";

  const season =
    seasonInput && !Number.isNaN(Number(seasonInput))
      ? Number(seasonInput)
      : null;
  const week =
    weekInput && weekInput !== "all" && !Number.isNaN(Number(weekInput))
      ? Number(weekInput)
      : null;

  const normalizedPlayType: CommonFilters["playType"] =
    playTypeInput === "pass" || playTypeInput === "run" || playTypeInput === "sack"
      ? playTypeInput
      : "all";

  return {
    seasonInput,
    filters: {
      season,
      week,
      playType: normalizedPlayType,
      shotgun: shotgunInput === "true",
      noHuddle: noHuddleInput === "true",
    } satisfies CommonFilters,
  };
}

export function applyPlayTypeFilter(query: any, playType: string | null) {
  if (!query) return query;
  if (playType === "pass") return query.eq("calc_is_pass", true);
  if (playType === "run") return query.eq("calc_is_run", true);
  if (playType === "sack") return query.eq("calc_is_sack", true);
  return query;
}

export function applyTierFilters(
  filters: CommonFilters,
  tier: UserTier
): { filters: CommonFilters; restricted: boolean; reason?: string } {
  if (tier === "premium") return { filters, restricted: false };
  if (tier === "free") {
    return {
      filters: {
        season: filters.season,
        week: null,
        playType: "all",
        shotgun: false,
        noHuddle: false,
      },
      restricted: true,
      reason: "filters-premium",
    };
  }
  return {
    filters: { ...DEFAULT_FILTERS },
    restricted: true,
    reason: "login-required",
  };
}

export async function resolveSeason(
  supabase: SupabaseClient | null,
  requestedSeason: number | null
) {
  if (requestedSeason != null) return { season: requestedSeason, metaError: null };
  if (!supabase) return { season: null, metaError: "missing-supabase-client" };

  const { data, error } = await supabase
    .from("games")
    .select("season")
    .order("season", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { season: null, metaError: error.message };
  }

  return { season: data?.season ?? null, metaError: null };
}
