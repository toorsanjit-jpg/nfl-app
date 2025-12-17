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
import { pillHref, getBaseUrl } from "@/lib/urlHelpers";
import { SavedViewsDropdown } from "@/components/saved/SavedViewsDropdown";
import { LockedFeature } from "@/components/premium/LockedFeature";
import {
  getAdvancedPermissions,
  getUserContextFromCookies,
} from "@/lib/auth";

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

type AdvancedSpecialResponse = {
  season: number | null;
  week: number | null;
  filters: { playType: string; shotgun: boolean; noHuddle: boolean };
  rows: SpecialRow[];
  _meta?: { missingSupabaseEnv?: true; error?: string; restricted?: boolean };
};

export const dynamic = "force-dynamic";

type AdvancedSpecialPageProps = {
  searchParams: { [key: string]: string | string[] | undefined };
};

async function fetchAdvancedSpecial(
  params: URLSearchParams
): Promise<AdvancedSpecialResponse> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/advanced/special?${params.toString()}`, {
    cache: "no-store",
    next: { revalidate: 0 },
  });

  let json: AdvancedSpecialResponse | null = null;
  try {
    json = (await res.json()) as AdvancedSpecialResponse;
  } catch (err) {
    console.error("Failed to parse advanced special response:", err);
  }

  if (!res.ok) {
    return {
      rows: json?.rows ?? [],
      season: json?.season ?? null,
      week: json?.week ?? null,
      filters:
        json?.filters ?? { playType: "all", shotgun: false, noHuddle: false },
      _meta: {
        ...(json?._meta || {}),
        error: json?._meta?.error ?? `HTTP ${res.status}`,
      },
    };
  }

  const safe = json ?? {
    rows: [],
    season: null,
    week: null,
    filters: { playType: "all", shotgun: false, noHuddle: false },
  };

  return {
    rows: safe.rows ?? [],
    season: safe.season ?? null,
    week: safe.week ?? null,
    filters: safe.filters ?? {
      playType: "all",
      shotgun: false,
      noHuddle: false,
    },
    _meta: safe._meta,
  };
}

export default async function AdvancedSpecialPage({
  searchParams,
}: AdvancedSpecialPageProps) {
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
              Sign in and upgrade to unlock special teams filters, saved views, and team-level detail.
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

  const { rows, season, week, filters } = await fetchAdvancedSpecial(params);
  const appliedPlayType = filters?.playType ?? effectivePlayType;
  const appliedShotgun = filters?.shotgun ?? effectiveShotgun;
  const appliedNoHuddle = filters?.noHuddle ?? effectiveNoHuddle;
  const appliedWeek = effectiveWeek;

  const basePath = "/advanced/special";
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
              League Special Teams — Advanced Summary
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {season ? `Season ${season}` : "Latest season"} ·{" "}
              {week ? `Week ${week}` : "All weeks"} · {rows.length} team rows
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Special Teams</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <SavedViewsDropdown
            basePath={basePath}
            scope="league"
            category="special"
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
                  <TableHead className="text-center">Plays</TableHead>
                  <TableHead className="text-center">Punts</TableHead>
                  <TableHead className="text-center">Kickoffs</TableHead>
                  <TableHead className="text-center">FG</TableHead>
                  <TableHead className="text-center">XP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-6 text-center text-sm text-muted-foreground"
                    >
                      No special teams data available for the current filters.
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
                        {row.plays ?? 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.punts ?? 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.kickoffs ?? 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.field_goals ?? 0}
                      </TableCell>
                      <TableCell className="text-center">
                        {row.extra_points ?? 0}
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
