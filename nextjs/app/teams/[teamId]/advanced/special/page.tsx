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
import type { TeamAdvancedSpecialSummary } from "@/types/TeamAdvancedSummary";
import type {
  TeamAdvancedSpecialResponse,
  TeamAdvancedSpecialRow,
  TeamSpecialGroupBy,
} from "@/app/api/teamAdvanced/special/route";

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
    .maybeSingle<{ season: number | null; week: number | null }>();
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
): Promise<TeamAdvancedSpecialSummary | null> {
  if (!supabase) return null;
  let query = supabase
    .from("team_advanced_special_teams")
    .select("*")
    .eq("team_id", teamId)
    .limit(1);
  if (season != null) query = query.eq("season", season);
  if (week != null) query = query.eq("week", week);
  const { data, error } = await query.maybeSingle();
  if (error) {
    console.error("team_advanced_special_teams fetch error:", error);
    return null;
  }
  return (data as TeamAdvancedSpecialSummary | null) ?? null;
}

async function fetchGrouped(
  supabase: SupabaseClient,
  teamId: string,
  groupBy: TeamSpecialGroupBy,
  season: number | null,
  week: number | null
): Promise<TeamAdvancedSpecialRow[]> {
  if (!supabase) return [];
  let query = supabase
    .from("team_advanced_special_teams")
    .select("*")
    .eq("team_id", teamId);
  if (season != null) query = query.eq("season", season);
  if (week != null) query = query.eq("week", week);
  const { data, error } = await query;
  if (error) {
    console.error("team_advanced_special_teams grouped fetch error:", error);
    return [];
  }
  return (data as TeamAdvancedSpecialRow[]) ?? [];
}

export default async function TeamAdvancedSpecialPage({
  params,
  searchParams,
}: PageProps) {
  const teamId = params.teamId;
  const supabase = getSupabase();

  const latest = await getLatestSelection(
    supabase,
    "team_advanced_special_teams",
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

  const allowed: TeamSpecialGroupBy[] = ["total", "week", "phase"];
  const groupBy: TeamSpecialGroupBy = allowed.includes(
    (searchParams.groupBy as TeamSpecialGroupBy) ?? "total"
  )
    ? ((searchParams.groupBy as TeamSpecialGroupBy) ?? "total")
    : "total";

  const phaseRaw =
    typeof searchParams.phase === "string" ? searchParams.phase : undefined;

  const weeks = await getAvailableWeeks(
    supabase,
    "team_advanced_special_teams",
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
  if (phaseRaw) urlParams.set("phase", phaseRaw);

  const basePath = `/teams/${encodeURIComponent(teamId)}/advanced/special`;

  const headlineStats = [
    { label: "ST Plays", value: summary?.st_plays_total ?? 0 },
    { label: "Punts", value: summary?.punt_plays ?? 0 },
    { label: "Kickoffs", value: summary?.kickoff_plays ?? 0 },
    { label: "FG Att", value: summary?.fg_att ?? 0 },
    { label: "XP Att", value: summary?.xp_att ?? 0 },
  ];

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {teamId.toUpperCase()} – Advanced Special Teams
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
          <CardTitle className="text-base font-semibold">Filters</CardTitle>
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
            {phaseRaw ? (
              <input type="hidden" name="phase" value={phaseRaw} />
            ) : null}
            <button
              type="submit"
              className="rounded-md border px-3 py-1 text-xs"
            >
              Apply
            </button>
          </form>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
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
              { key: "phase", label: "Phase" },
            ].map((g) => (
              <Link
                key={g.key}
                href={pillHref(
                  basePath,
                  urlParams,
                  "groupBy",
                  g.key as TeamSpecialGroupBy
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
                      : groupBy === "phase"
                      ? "Phase"
                      : "Totals"}
                  </TableHead>
                  <TableHead className="text-right">Plays</TableHead>
                  <TableHead className="text-right">FG Att</TableHead>
                  <TableHead className="text-right">FG Made</TableHead>
                  <TableHead className="text-right">Punts</TableHead>
                  <TableHead className="text-right">Punt Yds</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedRows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      No special teams data yet for this team with the current
                      filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  groupedRows.map((row, idx) => {
                    const label = row.label || row.group_value || "Totals";
                    const plays = row.plays ?? 0;
                    const playsLink = `/advanced/plays?teamId=${encodeURIComponent(
                      teamId
                    )}`;
                    return (
                      <TableRow key={row.group_value ?? `${idx}`}>
                        <TableCell>{label}</TableCell>
                        <TableCell className="text-right">
                          {plays > 0 ? (
                            <Link
                              href={playsLink}
                              className="underline underline-offset-2"
                            >
                              {plays}
                            </Link>
                          ) : (
                            plays
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.fg_att ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.fg_made ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.punts ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.punt_yards ?? 0}
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
