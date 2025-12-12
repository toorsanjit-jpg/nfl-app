import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { pillHref } from "@/lib/urlHelpers";
import type { TeamAdvancedOffenseSummary } from "@/types/TeamAdvancedSummary";
import type {
  TeamAdvancedOffenseRow,
  TeamOffenseGroupBy,
} from "@/types/TeamAdvancedOffense";

type PageProps = {
  params: { teamId: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

type SupabaseClient = ReturnType<typeof createClient> | null;

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getLatestSelection(
  supabase: SupabaseClient,
  table: string,
  teamId: string
) {
  if (!supabase) return { season: null, week: null };
  const { data } = await supabase
    .from(table)
    .select("season, week")
    .eq("team_id", teamId)
    .order("season", { ascending: false })
    .order("week", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { season: data?.season ?? null, week: data?.week ?? null };
}

async function getAvailableWeeks(
  supabase: SupabaseClient,
  table: string,
  teamId: string,
  season: number | null
) {
  if (!supabase || season == null) return [];
  const { data } = await supabase
    .from(table)
    .select("week")
    .eq("team_id", teamId)
    .eq("season", season);
  return Array.from(
    new Set((data ?? []).map((r: any) => r.week).filter((w) => w != null))
  ).sort((a, b) => Number(a) - Number(b));
}

async function fetchSummary(
  supabase: SupabaseClient,
  teamId: string,
  season: number | null,
  week: number | null
): Promise<TeamAdvancedOffenseSummary | null> {
  if (!supabase) return null;
  let query = supabase
    .from("team_advanced_offense")
    .select("*")
    .eq("team_id", teamId)
    .limit(1);
  if (season != null) query = query.eq("season", season);
  if (week != null) query = query.eq("week", week);
  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("team_advanced_offense fetch error:", error);
    return null;
  }
  return (data as TeamAdvancedOffenseSummary) ?? null;
}

async function fetchGrouped(
  supabase: SupabaseClient,
  teamId: string,
  groupBy: TeamOffenseGroupBy,
  season: number | null,
  week: number | null
): Promise<TeamAdvancedOffenseRow[]> {
  if (!supabase) return [];
  let query = supabase
    .from("team_advanced_offense")
    .select("*")
    .eq("team_id", teamId);
  if (season != null) query = query.eq("season", season);
  if (week != null) query = query.eq("week", week);
  const { data, error } = await query;
  if (error) {
    console.error("team_advanced_offense grouped fetch error:", error);
    return [];
  }
  // For now, table is already aggregated by week; treat rows as-is.
  return (data as TeamAdvancedOffenseRow[]) ?? [];
}

function formatPct(value: number | null | undefined, digits = 1) {
  if (typeof value !== "number") return "0.0%";
  return `${value.toFixed(digits)}%`;
}

function formatRate(value: number | null | undefined, digits = 1) {
  if (typeof value !== "number") return "0.0%";
  return `${(value * 100).toFixed(digits)}%`;
}

export default async function TeamAdvancedOffensePage({
  params,
  searchParams,
}: PageProps) {
  const teamId = params.teamId;
  const supabase = getSupabase();

  const latest = await getLatestSelection(
    supabase,
    "team_advanced_offense",
    teamId
  );

  const seasonParam =
    typeof searchParams.season === "string"
      ? Number(searchParams.season)
      : latest.season;
  const weekParam =
    typeof searchParams.week === "string"
      ? Number(searchParams.week)
      : latest.week;

  const groupBy = normalizeGroupBy(
    typeof searchParams.groupBy === "string"
      ? (searchParams.groupBy as TeamOffenseGroupBy)
      : undefined
  );

  const weeks = await getAvailableWeeks(
    supabase,
    "team_advanced_offense",
    teamId,
    seasonParam ?? latest.season
  );
  const summary = await fetchSummary(supabase, teamId, seasonParam, weekParam);
  const groupedRows = await fetchGrouped(
    supabase,
    teamId,
    groupBy,
    seasonParam,
    weekParam
  );

  const urlParams = new URLSearchParams();
  urlParams.set("teamId", teamId);
  if (seasonParam != null && !Number.isNaN(seasonParam)) {
    urlParams.set("season", String(seasonParam));
  }
  if (weekParam != null && !Number.isNaN(weekParam)) {
    urlParams.set("week", String(weekParam));
  }

  const basePath = `/teams/${encodeURIComponent(teamId)}/advanced/offense`;

  const headlineStats = [
    {
      label: "Plays",
      value: summary?.plays_offense ?? 0,
    },
    {
      label: "Pass / Run",
      value: `${summary?.pass_plays ?? 0} / ${summary?.run_plays ?? 0}`,
    },
    {
      label: "Yards",
      value: summary?.yards_gained_sum ?? 0,
    },
    {
      label: "Yds/Play",
      value:
        typeof summary?.yards_per_play === "number"
          ? summary.yards_per_play.toFixed(2)
          : "0.00",
    },
    {
      label: "Success Rate",
      value: formatRate(summary?.success_rate ?? null),
    },
    {
      label: "Explosive Pass / Run",
      value: `${summary?.explosive_pass ?? 0} / ${summary?.explosive_run ?? 0}`,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {teamId.toUpperCase()} – Advanced Offense
          </h1>
          <p className="text-sm text-muted-foreground">
            {seasonParam ? `Season ${seasonParam}` : "All seasons"}{" "}
            {weekParam ? `· Week ${weekParam}` : ""}
          </p>
        </div>
        <Badge variant="outline">Team Advanced</Badge>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="text-base font-semibold">
            Filters
          </CardTitle>
          <form className="flex flex-wrap items-center gap-3" method="get">
            <div className="flex items-center gap-2 text-sm">
              <label className="font-medium">Season</label>
              <select
                name="season"
                defaultValue={seasonParam ?? ""}
                className="rounded-md border px-2 py-1"
              >
                {latest.season ? (
                  Array.from(
                    new Set([latest.season, seasonParam].filter(Boolean))
                  )
                    .sort((a, b) => Number(b) - Number(a))
                    .map((s) => (
                      <option key={s as number} value={s as number}>
                        {s}
                      </option>
                    ))
                ) : (
                  <option value="">-</option>
                )}
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <label className="font-medium">Week</label>
              <select
                name="week"
                defaultValue={weekParam ?? ""}
                className="rounded-md border px-2 py-1"
              >
                <option value="">All</option>
                {weeks.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <input type="hidden" name="groupBy" value={groupBy} />
            <button
              type="submit"
              className="rounded-md border px-3 py-1 text-xs"
            >
              Apply
            </button>
          </form>
        </CardHeader>
      </Card>

      {/* Headline stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {headlineStats.map((item) => (
          <Card key={item.label}>
            <CardContent className="py-4">
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="text-lg font-semibold">{item.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2">
          <CardTitle className="text-base font-semibold">
            Grouped View
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">Group by:</span>
            {[
              { key: "total", label: "Totals" },
              { key: "week", label: "Week" },
              { key: "quarter", label: "Quarter" },
              { key: "qb", label: "QB" },
              { key: "rb", label: "RB" },
            ].map((g) => (
              <Link
                key={g.key}
                href={pillHref(
                  basePath,
                  urlParams,
                  "groupBy",
                  g.key as TeamOffenseGroupBy
                )}
                className={`rounded-full border px-3 py-1 ${
                  groupBy === g.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-background"
                }`}
              >
                {g.label}
              </Link>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">
                    {groupBy === "week"
                      ? "Week"
                      : groupBy === "quarter"
                      ? "Quarter"
                      : groupBy === "qb"
                      ? "QB"
                      : groupBy === "rb"
                      ? "RB"
                      : "Totals"}
                  </TableHead>
                  <TableHead className="text-right">Plays</TableHead>
                  <TableHead className="text-right">Pass</TableHead>
                  <TableHead className="text-right">Run</TableHead>
                  <TableHead className="text-right">Yards</TableHead>
                  <TableHead className="text-right">Yds/Play</TableHead>
                  <TableHead className="text-right">Success</TableHead>
                  <TableHead className="text-right">Shotgun</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      No data yet for this team with the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedRows.map((row, idx) => {
                    const label = row.label || row.group_value || "Totals";
                    return (
                      <TableRow key={row.group_value ?? `${idx}`}>
                        <TableCell>{label}</TableCell>
                        <TableCell className="text-right">
                          {row.plays ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.pass_plays ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.run_plays ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.total_yards ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {typeof row.yards_per_play === "number"
                            ? row.yards_per_play.toFixed(2)
                            : "0.00"}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatRate(row.success_rate)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatRate(row.shotgun_rate)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
