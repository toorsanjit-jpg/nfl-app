import type { SupabaseClient } from "@supabase/supabase-js";

export type PlayTypeFilter = "all" | "pass" | "run" | "sack";

export type CommonFilters = {
  season: number | null;
  week: number | null;
  playType: PlayTypeFilter;
  shotgun: boolean;
  noHuddle: boolean;
};

export function parseCommonFilters(
  searchParams: URLSearchParams
): {
  seasonInput: string | null;
  weekInput: string | null;
  filters: CommonFilters;
} {
  const seasonInput = searchParams.get("season");
  const weekInput = searchParams.get("week");

  const playTypeRaw =
    searchParams.get("playType") ?? searchParams.get("playResult"); // support legacy key
  const playType: PlayTypeFilter =
    playTypeRaw === "pass" || playTypeRaw === "run" || playTypeRaw === "sack"
      ? playTypeRaw
      : "all";

  const shotgun = searchParams.get("shotgun") === "true";
  const noHuddle = searchParams.get("noHuddle") === "true";

  const season =
    seasonInput && !Number.isNaN(Number(seasonInput))
      ? Number(seasonInput)
      : null;

  const week =
    weekInput &&
    weekInput !== "all" &&
    !Number.isNaN(Number(weekInput))
      ? Number(weekInput)
      : null;

  return {
    seasonInput,
    weekInput,
    filters: {
      season,
      week,
      playType,
      shotgun,
      noHuddle,
    },
  };
}

export async function resolveSeason(
  supabase: SupabaseClient,
  requestedSeason: number | null
): Promise<{ season: number | null; metaError?: string }> {
  if (requestedSeason != null) {
    return { season: requestedSeason };
  }

  const { data, error } = await supabase
    .from("games")
    .select("season")
    .order("season", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { season: null, metaError: error.message };
  }

  return { season: data?.season ?? null };
}

export function applyPlayTypeFilter<T>(
  query: T,
  playType: PlayTypeFilter
): T {
  if (playType === "pass") {
    // @ts-expect-error: Supabase query builder supports chained filters
    return query.eq("calc_is_pass", true);
  }
  if (playType === "run") {
    // @ts-expect-error: Supabase query builder supports chained filters
    return query.eq("calc_is_run", true);
  }
  if (playType === "sack") {
    // @ts-expect-error: Supabase query builder supports chained filters
    return query.eq("calc_is_sack", true);
  }
  return query;
}
