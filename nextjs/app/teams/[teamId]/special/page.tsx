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
  TeamAdvancedSpecialResponse,
  TeamAdvancedSpecialRow,
  TeamSpecialGroupBy,
} from "@/app/api/teamAdvanced/special/route";

type PageProps = {
  params: { teamId: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

function normalizeGroupBy(raw: string | undefined): TeamSpecialGroupBy {
  const allowed: TeamSpecialGroupBy[] = ["total", "week", "phase"];
  if (!raw) return "total";
  return (allowed.includes(raw as TeamSpecialGroupBy)
    ? raw
    : "total") as TeamSpecialGroupBy;
}

async function fetchTeamSpecial(
  teamId: string,
  params: URLSearchParams
): Promise<TeamAdvancedSpecialResponse> {
  const base = getBaseUrl();
  const res = await fetch(
    `${base}/api/teamAdvanced/special?${params.toString()}`,
    {
      cache: "no-store",
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    console.error(
      "Failed to fetch team advanced special:",
      res.status,
      await res.text()
    );
    return { groupBy: "total", rows: [] };
  }

  const json = (await res.json()) as TeamAdvancedSpecialResponse;
  return {
    groupBy: json.groupBy ?? "total",
    rows: json.rows ?? [],
  };
}

export default async function TeamSpecialPage({
  params,
  searchParams,
}: PageProps) {
  const teamId = params.teamId;

  const urlParams = new URLSearchParams();
  urlParams.set("teamId", teamId);

  const seasonRaw =
    typeof searchParams.season === "string" ? searchParams.season : undefined;
  if (seasonRaw) urlParams.set("season", seasonRaw);

  const groupByRaw =
    typeof searchParams.groupBy === "string"
      ? searchParams.groupBy
      : undefined;
  const groupBy = normalizeGroupBy(groupByRaw);
  urlParams.set("groupBy", groupBy);

  const phaseRaw =
    typeof searchParams.phase === "string" ? searchParams.phase : undefined;
  if (phaseRaw) urlParams.set("phase", phaseRaw);

  const data = await fetchTeamSpecial(teamId, urlParams);
  const rows = data.rows ?? [];

  const basePath = `/teams/${encodeURIComponent(teamId)}/special`;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-8">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">
              {teamId.toUpperCase()} – Special Teams (Team Advanced)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {seasonRaw ? `Season ${seasonRaw}` : "All seasons"} ·{" "}
              {rows.length} group rows
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Special Teams</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Group-by selector */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">Group by:</span>
            {[
              { key: "total", label: "Totals" },
              { key: "week", label: "By Week" },
              { key: "phase", label: "By Phase" },
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

          {/* Phase dropdown-like pills (FG, Punt, Kickoff, Returns) */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-muted-foreground">Phase:</span>
            <Link
              href={pillHref(basePath, urlParams, "phase", null)}
              className={`rounded-full border px-3 py-1 ${
                !phaseRaw ? "bg-primary text-primary-foreground" : "bg-background"
              }`}
            >
              All
            </Link>
            {[
              { key: "fg", label: "Field Goals" },
              { key: "punt", label: "Punts" },
              { key: "kickoff", label: "Kickoffs" },
              { key: "pr", label: "Punt Returns" },
              { key: "kr", label: "Kick Returns" },
            ].map((p) => (
              <Link
                key={p.key}
                href={pillHref(basePath, urlParams, "phase", p.key)}
                className={`rounded-full border px-3 py-1 ${
                  phaseRaw === p.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-background"
                }`}
              >
                {p.label}
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
                      : groupBy === "phase"
                      ? "Phase"
                      : "Totals"}
                  </TableHead>
                  <TableHead className="w-20 text-right">Plays</TableHead>
                  <TableHead className="w-24 text-right">FG Att</TableHead>
                  <TableHead className="w-24 text-right">FG Made</TableHead>
                  <TableHead className="w-24 text-right">Punts</TableHead>
                  <TableHead className="w-24 text-right">Punt Yds</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
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
                  rows.map((row: TeamAdvancedSpecialRow, idx: number) => {
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
