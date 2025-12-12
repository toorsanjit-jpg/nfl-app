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
import Link from "next/link";
import type { TeamOffenseRow } from "@/types/TeamAdvanced";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

async function fetchAdvancedOffense(
  params: URLSearchParams
): Promise<{ rows: TeamOffenseRow[]; season: number | null }> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/advanced/offense?${params.toString()}`, {
    cache: "no-store",
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    console.error("Failed to fetch advanced offense:", await res.text());
    return { rows: [], season: null };
  }

  const json = (await res.json()) as {
    rows: TeamOffenseRow[];
    season: number | null;
  };

  return {
    rows: json.rows ?? [],
    season: json.season ?? null,
  };
}

type AdvancedOffensePageProps = {
  searchParams: { [key: string]: string | string[] | undefined };
};

export default async function AdvancedOffensePage({
  searchParams,
}: AdvancedOffensePageProps) {
  const params = new URLSearchParams();

  const seasonRaw = searchParams.season;
  if (typeof seasonRaw === "string") {
    params.set("season", seasonRaw);
  }

  const { rows, season } = await fetchAdvancedOffense(params);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-8">
      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl font-semibold">
              League Offense – Advanced Team Summary
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {season ? `Season ${season}` : "All seasons"} ·{" "}
              {rows.length} team rows
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Team Offense</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Simple future filter bar (season picker, etc.) can go here */}

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
