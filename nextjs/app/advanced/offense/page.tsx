import Link from "next/link";
import { Lock } from "lucide-react";
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
import { pillHref } from "@/lib/urlHelpers";
import type { TeamOffenseRow } from "@/types/TeamAdvanced";
import { SavedViewsDropdown } from "@/components/saved/SavedViewsDropdown";
import { LockedFeature } from "@/components/premium/LockedFeature";
import {
  getAdvancedPermissions,
  getUserContextFromCookies,
} from "@/lib/auth";

type AdvancedOffenseResponse = {
  season: number | null;
  week: number | null;
  filters: { playType: string; shotgun: boolean; noHuddle: boolean };
  rows: TeamOffenseRow[];
  _meta?: { missingSupabaseEnv?: true; error?: string };
};

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

async function fetchAdvancedOffense(
  params: URLSearchParams
): Promise<AdvancedOffenseResponse> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/advanced/offense?${params.toString()}`, {
    cache: "no-store",
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    console.error("Failed to fetch advanced offense:", await res.text());
    return {
      rows: [],
      season: null,
      week: null,
      filters: { playType: "all", shotgun: false, noHuddle: false },
    };
  }

  const json = (await res.json()) as AdvancedOffenseResponse;

  return {
    rows: json.rows ?? [],
    season: json.season ?? null,
    week: json.week ?? null,
    filters: json.filters ?? {
      playType: "all",
      shotgun: false,
      noHuddle: false,
    },
    _meta: json._meta,
  };
}

type AdvancedOffensePageProps = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function AdvancedOffensePage({
  searchParams,
}: AdvancedOffensePageProps) {
  const userCtx = await getUserContextFromCookies();
  const perms = getAdvancedPermissions(userCtx);

  if (!perms.canAccessAdvanced) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Advanced stats require an account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Sign in and upgrade to unlock advanced offense filters, saved views, and team-level detail.
            </p>
            <div className="flex gap-2">
              <Button asChild>
                <Link href="/premium">Upgrade</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/">Back to basic stats</Link>
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

  const normalizedPlayType = ["pass", "run", "sack"].includes(playTypeRaw)
    ? playTypeRaw
    : "all";
  const normalizedWeek =
    weekRaw && weekRaw !== "all" && !Number.isNaN(Number(weekRaw))
      ? weekRaw
      : "all";
  const shotgun = shotgunRaw === "true";
  const noHuddle = noHuddleRaw === "true";
  const allowFullFilters = perms.canUseFullFilters;

  const effectiveWeek = allowFullFilters ? normalizedWeek : "all";
  const effectivePlayType = allowFullFilters ? normalizedPlayType : "all";
  const effectiveShotgun = allowFullFilters ? shotgun : false;
  const effectiveNoHuddle = allowFullFilters ? noHuddle : false;

  const params = new URLSearchParams();
  if (seasonRaw) params.set("season", seasonRaw);
  if (effectiveWeek !== "all") params.set("week", effectiveWeek);
  if (effectivePlayType !== "all") params.set("playType", effectivePlayType);
  if (effectiveShotgun) params.set("shotgun", "true");
  if (effectiveNoHuddle) params.set("noHuddle", "true");

  const { rows, season, week, filters } = await fetchAdvancedOffense(params);
  const appliedPlayType = filters?.playType ?? effectivePlayType;
  const appliedShotgun = filters?.shotgun ?? effectiveShotgun;
  const appliedNoHuddle = filters?.noHuddle ?? effectiveNoHuddle;
  const appliedWeek = effectiveWeek;

  const basePath = "/advanced/offense";
  const weekOptions = Array.from({ length: 22 }, (_, i) =>
    (i + 1).toString()
  );
  const seasonOptions = Array.from({ length: 5 }, (_, i) =>
    ((season ?? new Date().getFullYear()) - i).toString()
  );
  const currentFilterState = {
    ...(seasonRaw ? { season: seasonRaw } : {}),
    ...(appliedWeek !== "all" ? { week: appliedWeek } : {}),
    ...(appliedPlayType !== "all" ? { playType: appliedPlayType } : {}),
    ...(appliedShotgun ? { shotgun: true } : {}),
    ...(appliedNoHuddle ? { noHuddle: true } : {}),
  };

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-8">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">
              League Offense — Advanced Team Summary
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {season ? `Season ${season}` : "Latest season"} •{" "}
              {week ? `Week ${week}` : "All weeks"} • {rows.length} team rows
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Team Offense</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <SavedViewsDropdown
            basePath={basePath}
            scope="league"
            category="offense"
            currentFilters={currentFilterState}
            tier={perms.tier}
          />
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <form className="flex flex-wrap items-center gap-3" method="get">
              <input type="hidden" name="playType" value={appliedPlayType} />
              <input
                type="hidden"
                name="shotgun"
                value={appliedShotgun ? "true" : "false"}
              />
              <input
                type="hidden"
                name="noHuddle"
                value={appliedNoHuddle ? "true" : "false"}
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
                <span className="flex items-center gap-1 text-muted-foreground">
                  Week
                  {!allowFullFilters ? <Lock className="h-3 w-3" /> : null}
                </span>
                <select
                  name="week"
                  defaultValue={appliedWeek}
                  className="rounded-md border px-2 py-1"
                  disabled={!allowFullFilters}
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
              {allowFullFilters ? (
                [
                  { key: "all", label: "All" },
                  { key: "pass", label: "Pass" },
                  { key: "run", label: "Run" },
                  { key: "sack", label: "Sack" },
                ].map((p) => (
                  <Link
                    key={p.key}
                    href={pillHref(
                      basePath,
                      params,
                      "playType",
                      p.key === "all" ? null : p.key
                    )}
                    className={`rounded-full border px-3 py-1 ${
                      appliedPlayType === p.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-background"
                    }`}
                  >
                    {p.label}
                  </Link>
                ))
              ) : (
                <LockedFeature label="Play type (premium)" />
              )}

              <span className="ml-4 font-semibold text-muted-foreground">
                Shotgun:
              </span>
              {allowFullFilters ? (
                <Link
                  href={pillHref(
                    basePath,
                    params,
                    "shotgun",
                    appliedShotgun ? null : "true"
                  )}
                  className={`rounded-full border px-3 py-1 ${
                    appliedShotgun
                      ? "bg-primary text-primary-foreground"
                      : "bg-background"
                  }`}
                >
                  {appliedShotgun ? "On" : "Off"}
                </Link>
              ) : (
                <LockedFeature label="Shotgun filter" />
              )}

              <span className="font-semibold text-muted-foreground">
                No-huddle:
              </span>
              {allowFullFilters ? (
                <Link
                  href={pillHref(
                    basePath,
                    params,
                    "noHuddle",
                    appliedNoHuddle ? null : "true"
                  )}
                  className={`rounded-full border px-3 py-1 ${
                    appliedNoHuddle
                      ? "bg-primary text-primary-foreground"
                      : "bg-background"
                  }`}
                >
                  {appliedNoHuddle ? "On" : "Off"}
                </Link>
              ) : (
                <LockedFeature label="No-huddle filter" />
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-center">Season</TableHead>
                  <TableHead className="text-center">Games</TableHead>
                  <TableHead className="text-center">Plays</TableHead>
                  <TableHead className="text-center">Pass / Run</TableHead>
                  <TableHead className="text-right">Yds</TableHead>
                  <TableHead className="text-right">Yds/Play</TableHead>
                  <TableHead className="text-right">Pass/G</TableHead>
                  <TableHead className="text-right">Rush/G</TableHead>
                  <TableHead className="text-right">3D%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      No team offense data available for the current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={`${row.team_id}-${row.season ?? "all"}`}>
                      <TableCell>
                        <Link
                          href={`/teams/${row.team_id.toLowerCase()}`}
                          className="font-medium hover:underline"
                        >
                          {row.team_name ?? row.team_id}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">
                        {row.season ?? "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.games ?? 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.plays ?? 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {(row.pass_plays ?? 0)}/{row.run_plays ?? 0}
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
                        {typeof row.pass_yards_per_game === "number"
                          ? row.pass_yards_per_game.toFixed(1)
                          : "0.0"}
                      </TableCell>
                      <TableCell className="text-right">
                        {typeof row.rush_yards_per_game === "number"
                          ? row.rush_yards_per_game.toFixed(1)
                          : "0.0"}
                      </TableCell>
                      <TableCell className="text-right">
                        {typeof row.third_down_pct === "number"
                          ? `${row.third_down_pct.toFixed(1)}%`
                          : "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
