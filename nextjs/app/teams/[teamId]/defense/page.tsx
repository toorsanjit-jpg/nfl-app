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
import { getBaseUrl, pillHref } from "@/lib/urlHelpers";
import type {
  TeamAdvancedDefenseResponse,
  TeamAdvancedDefenseRow,
  TeamDefenseGroupBy,
} from "@/app/api/teamAdvanced/defense/route";

type PageProps = {
  params: { teamId: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

function normalizeGroupBy(raw: string | undefined): TeamDefenseGroupBy {
  const allowed: TeamDefenseGroupBy[] = ["total", "week", "quarter"];
  if (!raw) return "total";
  return (allowed.includes(raw as TeamDefenseGroupBy)
    ? raw
    : "total") as TeamDefenseGroupBy;
}

async function fetchTeamDefense(
  teamId: string,
  params: URLSearchParams
): Promise<TeamAdvancedDefenseResponse> {
  const base = getBaseUrl();
  const res = await fetch(
    `${base}/api/teamAdvanced/defense?${params.toString()}`,
    {
      cache: "no-store",
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    console.error(
      "Failed to fetch team advanced defense:",
      res.status,
      await res.text()
    );
    return { groupBy: "total", rows: [] };
  }

  const json = (await res.json()) as TeamAdvancedDefenseResponse;
  return {
    groupBy: json.groupBy ?? "total",
    rows: json.rows ?? [],
  };
}

export default async function TeamDefensePage({
  params,
  searchParams,
}: PageProps) {
  const teamId = params.teamId;

  const urlParams = new URLSearchParams();
  urlParams.set("teamId", teamId);

  const seasonRaw =
    typeof searchParams.season === "string" ? searchParams.season : undefined;
  if (seasonRaw) urlParams.set("season", seasonRaw);

  const downRaw =
    typeof searchParams.down === "string" ? searchParams.down : undefined;
  if (downRaw) urlParams.set("down", downRaw);

  const quarterRaw =
    typeof searchParams.quarter === "string"
      ? searchParams.quarter
      : undefined;
  if (quarterRaw) urlParams.set("quarter", quarterRaw);

  const playResultRaw =
    typeof searchParams.playResult === "string"
      ? searchParams.playResult
      : undefined;
  if (playResultRaw) urlParams.set("playResult", playResultRaw);

  const groupByRaw =
    typeof searchParams.groupBy === "string"
      ? searchParams.groupBy
      : undefined;
  const groupBy = normalizeGroupBy(groupByRaw);
  urlParams.set("groupBy", groupBy);

  const data = await fetchTeamDefense(teamId, urlParams);
  const rows = data.rows ?? [];

  const basePath = `/teams/${encodeURIComponent(teamId)}/defense`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-8">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">
              {teamId.toUpperCase()} – Defense (Team Advanced)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {seasonRaw ? `Season ${seasonRaw}` : "All seasons"} ·{" "}
              {rows.length} group rows
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Defense</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Group-by selector */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">Group by:</span>
            {[
              { key: "total", label: "Totals" },
              { key: "week", label: "By Week" },
              { key: "quarter", label: "By Quarter" },
            ].map((g) => (
              <Link
                key={g.key}
                href={pillHref(
                  basePath,
                  urlParams,
                  "groupBy",
                  g.key as TeamDefenseGroupBy
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

          {/* Filter pills row */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Down */}
            <span className="font-semibold text-muted-foreground">Down:</span>
            <Link
              href={pillHref(basePath, urlParams, "down", null)}
              className={`rounded-full border px-3 py-1 ${
                !downRaw ? "bg-primary text-primary-foreground" : "bg-background"
              }`}
            >
              All
            </Link>
            {[1, 2, 3, 4].map((d) => (
              <Link
                key={d}
                href={pillHref(basePath, urlParams, "down", String(d))}
                className={`rounded-full border px-3 py-1 ${
                  downRaw === String(d)
                    ? "bg-primary text-primary-foreground"
                    : "bg-background"
                }`}
              >
                {d}
              </Link>
            ))}

            {/* Quarter */}
            <span className="ml-4 font-semibold text-muted-foreground">
              Quarter:
            </span>
            <Link
              href={pillHref(basePath, urlParams, "quarter", null)}
              className={`rounded-full border px-3 py-1 ${
                !quarterRaw
                  ? "bg-primary text-primary-foreground"
                  : "bg-background"
              }`}
            >
              All
            </Link>
            {[1, 2, 3, 4].map((q) => (
              <Link
                key={q}
                href={pillHref(basePath, urlParams, "quarter", String(q))}
                className={`rounded-full border px-3 py-1 ${
                  quarterRaw === String(q)
                    ? "bg-primary text-primary-foreground"
                    : "bg-background"
                }`}
              >
                Q{q}
              </Link>
            ))}

            {/* Play type */}
            <span className="ml-4 font-semibold text-muted-foreground">
              Type:
            </span>
            <Link
              href={pillHref(basePath, urlParams, "playResult", null)}
              className={`rounded-full border px-3 py-1 ${
                !playResultRaw
                  ? "bg-primary text-primary-foreground"
                  : "bg-background"
              }`}
            >
              All
            </Link>
            {["pass", "run", "sack", "other"].map((kind) => (
              <Link
                key={kind}
                href={pillHref(basePath, urlParams, "playResult", kind)}
                className={`rounded-full border px-3 py-1 capitalize ${
                  playResultRaw === kind
                    ? "bg-primary text-primary-foreground"
                    : "bg-background"
                }`}
              >
                {kind}
              </Link>
            ))}
          </div>

          {/* Results table */}
          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">
                    {groupBy === "week"
                      ? "Week"
                      : groupBy === "quarter"
                      ? "Quarter"
                      : "Totals"}
                  </TableHead>
                  <TableHead className="w-20 text-right">Plays</TableHead>
                  <TableHead className="w-24 text-right">Pass</TableHead>
                  <TableHead className="w-24 text-right">Run</TableHead>
                  <TableHead className="w-24 text-right">Yds Allowed</TableHead>
                  <TableHead className="w-24 text-right">
                    Yds/Play Allowed
                  </TableHead>
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
                  rows.map((row: TeamAdvancedDefenseRow, idx: number) => {
                    const label = row.label || row.group_value || "Totals";
                    const plays = row.plays_defended ?? 0;

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
                          {row.pass_plays_defended ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.run_plays_defended ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.yards_allowed ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          {typeof row.yards_per_play_allowed === "number"
                            ? row.yards_per_play_allowed.toFixed(2)
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
