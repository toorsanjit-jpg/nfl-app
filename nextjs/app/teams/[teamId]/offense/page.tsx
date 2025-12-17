import Link from "next/link";
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
import { Button } from "@/components/ui/button";
import { getBaseUrl, pillHref } from "@/lib/urlHelpers";
import { SavedViewsDropdown } from "@/components/saved/SavedViewsDropdown";
import {
  getAdvancedPermissions,
  getUserContextFromCookies,
} from "@/lib/auth";
import type {
  TeamAdvancedOffenseResponse,
  TeamOffenseGroupBy,
  TeamAdvancedOffenseRow,
} from "@/types/TeamAdvancedOffense";

type PageProps = {
  params: { teamId: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

function normalizeGroupBy(raw: string | undefined): TeamOffenseGroupBy {
  const allowed: TeamOffenseGroupBy[] = [
    "total",
    "week",
    "quarter",
    "qb",
    "rb",
  ];
  if (!raw) return "total";
  return (allowed.includes(raw as TeamOffenseGroupBy)
    ? raw
    : "total") as TeamOffenseGroupBy;
}

async function fetchTeamOffense(
  teamId: string,
  params: URLSearchParams
): Promise<TeamAdvancedOffenseResponse> {
  const base = getBaseUrl();
  const res = await fetch(
    `${base}/api/teamAdvanced/offense?${params.toString()}`,
    {
      cache: "no-store",
      next: { revalidate: 0 },
    }
  );

  let json: TeamAdvancedOffenseResponse | null = null;
  try {
    json = (await res.json()) as TeamAdvancedOffenseResponse;
  } catch (err) {
    console.error("team advanced offense parse error:", err);
  }

  if (!res.ok) {
    const restricted =
      res.status === 401 || res.status === 403 || json?._meta?.restricted;
    return {
      groupBy: json?.groupBy ?? "total",
      rows: json?.rows ?? [],
      season: json?.season ?? null,
      week: json?.week ?? null,
      filters:
        json?.filters ?? { playType: "all", shotgun: false, noHuddle: false },
      _meta: { ...(json?._meta || {}), ...(restricted ? { restricted: true } : {}) },
    };
  }

  const safe = json ?? {
    groupBy: "total",
    rows: [],
    season: null,
    week: null,
    filters: { playType: "all", shotgun: false, noHuddle: false },
  };
  return {
    groupBy: safe.groupBy ?? "total",
    rows: safe.rows ?? [],
    season: safe.season ?? null,
    week: safe.week ?? null,
    filters:
      safe.filters ?? {
        playType: "all",
        shotgun: false,
        noHuddle: false,
      },
    _meta: safe._meta,
  };
}

export default async function TeamOffensePage({
  params,
  searchParams,
}: PageProps) {
  const teamId = params.teamId;
  const userCtx = await getUserContextFromCookies();
  const perms = getAdvancedPermissions(userCtx);

  if (!perms.canAccessTeamAdvanced) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Premium required for team advanced offense
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Upgrade to unlock team-level advanced splits, filters, and saved views.
            </p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/premium">Upgrade</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/teams/${encodeURIComponent(teamId)}`}>
                  Back to overview
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const seasonRaw =
    typeof searchParams.season === "string" ? searchParams.season : "";
  const weekRaw =
    typeof searchParams.week === "string" ? searchParams.week : "all";
  const playTypeRaw =
    typeof searchParams.playType === "string" ? searchParams.playType : "all";
  const shotgunRaw =
    typeof searchParams.shotgun === "string" ? searchParams.shotgun : "false";
  const noHuddleRaw =
    typeof searchParams.noHuddle === "string"
      ? searchParams.noHuddle
      : "false";
  const groupByRaw =
    typeof searchParams.groupBy === "string"
      ? searchParams.groupBy
      : undefined;
  const groupBy = normalizeGroupBy(groupByRaw);

  const normalizedPlayType = ["pass", "run", "sack"].includes(playTypeRaw)
    ? playTypeRaw
    : "all";
  const normalizedWeek =
    weekRaw && weekRaw !== "all" && !Number.isNaN(Number(weekRaw))
      ? weekRaw
      : "all";
  const shotgun = shotgunRaw === "true";
  const noHuddle = noHuddleRaw === "true";

  const urlParams = new URLSearchParams();
  urlParams.set("teamId", teamId);
  urlParams.set("groupBy", groupBy);
  if (seasonRaw) urlParams.set("season", seasonRaw);
  if (normalizedWeek !== "all") urlParams.set("week", normalizedWeek);
  if (normalizedPlayType !== "all") urlParams.set("playType", normalizedPlayType);
  if (shotgun) urlParams.set("shotgun", "true");
  if (noHuddle) urlParams.set("noHuddle", "true");

  const data = await fetchTeamOffense(teamId, urlParams);
  const rows = data.rows ?? [];
  const currentSeason = data.season ?? (seasonRaw ? Number(seasonRaw) : null);
  const currentWeek =
    data.week ??
    (normalizedWeek && normalizedWeek !== "all"
      ? Number(normalizedWeek)
      : null);
  const currentPlayType =
    data.filters?.playType ?? normalizedPlayType ?? "all";
  const currentShotgun =
    data.filters?.shotgun ?? shotgun;
  const currentNoHuddle =
    data.filters?.noHuddle ?? noHuddle;

  const basePath = `/teams/${encodeURIComponent(teamId)}/offense`;
  const weekOptions = Array.from({ length: 22 }, (_, i) =>
    (i + 1).toString()
  );
  const seasonOptions = Array.from({ length: 5 }, (_, i) =>
    ((currentSeason ?? new Date().getFullYear()) - i).toString()
  );
  const currentFilterState = {
    teamId,
    groupBy,
    ...(seasonRaw ? { season: seasonRaw } : {}),
    ...(normalizedWeek !== "all" ? { week: normalizedWeek } : {}),
    ...(currentPlayType !== "all" ? { playType: currentPlayType } : {}),
    ...(currentShotgun ? { shotgun: true } : {}),
    ...(currentNoHuddle ? { noHuddle: true } : {}),
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-8">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">
              {teamId.toUpperCase()} — Offense (Team Advanced)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {currentSeason ? `Season ${currentSeason}` : "Latest season"} •{" "}
              {currentWeek ? `Week ${currentWeek}` : "All weeks"} •{" "}
              {rows.length} group rows
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Offense</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <SavedViewsDropdown
            basePath={basePath}
            scope="team"
            teamId={teamId}
            category="offense"
            currentFilters={currentFilterState}
            tier={perms.tier}
          />
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">Group by:</span>
            {[
              { key: "total", label: "Totals" },
              { key: "week", label: "By Week" },
              { key: "quarter", label: "By Quarter" },
              { key: "qb", label: "By QB" },
              { key: "rb", label: "By RB" },
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

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <form className="flex flex-wrap items-center gap-3" method="get">
              <input type="hidden" name="groupBy" value={groupBy} />
              <input type="hidden" name="playType" value={currentPlayType} />
              <input
                type="hidden"
                name="shotgun"
                value={currentShotgun ? "true" : "false"}
              />
              <input
                type="hidden"
                name="noHuddle"
                value={currentNoHuddle ? "true" : "false"}
              />

              <label className="flex items-center gap-2">
                <span className="text-muted-foreground">Season</span>
                <select
                  name="season"
                  defaultValue={seasonRaw}
                  className="rounded-md border px-2 py-1"
                >
                  <option value="">Latest</option>
                  {seasonOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2">
                <span className="text-muted-foreground">Week</span>
                <select
                  name="week"
                  defaultValue={normalizedWeek}
                  className="rounded-md border px-2 py-1"
                >
                  <option value="all">All</option>
                  {weekOptions.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </label>

              <Button type="submit" size="sm" variant="outline">
                Apply
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-muted-foreground">
                Play type:
              </span>
              {[
                { key: "all", label: "All" },
                { key: "pass", label: "Pass" },
                { key: "run", label: "Run" },
                { key: "sack", label: "Sack" },
              ].map((p) => (
                <Link
                  key={p.key}
                  href={pillHref(
                    basePath,
                    urlParams,
                    "playType",
                    p.key === "all" ? null : p.key
                  )}
                  className={`rounded-full border px-3 py-1 ${
                    currentPlayType === p.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-background"
                  }`}
                >
                  {p.label}
                </Link>
              ))}

              <span className="ml-4 font-semibold text-muted-foreground">
                Shotgun:
              </span>
              <Link
                href={pillHref(
                  basePath,
                  urlParams,
                  "shotgun",
                  currentShotgun ? null : "true"
                )}
                className={`rounded-full border px-3 py-1 ${
                  currentShotgun
                    ? "bg-primary text-primary-foreground"
                    : "bg-background"
                }`}
              >
                {currentShotgun ? "On" : "Off"}
              </Link>

              <span className="font-semibold text-muted-foreground">
                No-huddle:
              </span>
              <Link
                href={pillHref(
                  basePath,
                  urlParams,
                  "noHuddle",
                  currentNoHuddle ? null : "true"
                )}
                className={`rounded-full border px-3 py-1 ${
                  currentNoHuddle
                    ? "bg-primary text-primary-foreground"
                    : "bg-background"
                }`}
              >
                {currentNoHuddle ? "On" : "Off"}
              </Link>
            </div>
          </div>

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
                  <TableHead className="w-20 text-right">Plays</TableHead>
                  <TableHead className="w-24 text-right">Pass</TableHead>
                  <TableHead className="w-24 text-right">Run</TableHead>
                  <TableHead className="w-24 text-right">Yards</TableHead>
                  <TableHead className="w-24 text-right">Yds/Play</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      No data yet for this team with the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row: TeamAdvancedOffenseRow, idx: number) => {
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
