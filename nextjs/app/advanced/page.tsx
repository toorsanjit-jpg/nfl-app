// nextjs/app/advanced/page.tsx
import Link from "next/link";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { TeamOffenseRow } from "@/types/TeamAdvanced";

export const dynamic = "force-dynamic";

type AdvancedPageProps = {
  searchParams?: {
    season?: string;
    groupBy?: string;
  };
};

async function fetchOffenseSummary(params: {
  season?: string;
  groupBy?: string;
}): Promise<TeamOffenseRow[]> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : "http://localhost:3000");

  const qp = new URLSearchParams();
  if (params.season) qp.set("season", params.season);
  if (params.groupBy) qp.set("groupBy", params.groupBy);

  const res = await fetch(
    `${base}/api/advanced/offense?${qp.toString()}`,
    {
      cache: "no-store",
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    console.error("advanced offense API error:", res.status, await res.text());
    return [];
  }

  const json = await res.json();
  return (json.rows || []) as TeamOffenseRow[];
}

export default async function AdvancedPage({ searchParams }: AdvancedPageProps) {
  const groupBy = searchParams?.groupBy ?? "totals";
  const seasonParam = searchParams?.season ?? "";

  const rows = await fetchOffenseSummary({
    groupBy,
    season: seasonParam || undefined,
  });

  // derive available seasons from data
  const seasons = Array.from(
    new Set(
      rows
        .map((r) => r.season)
        .filter((s): s is number => s !== null && s !== undefined)
    )
  ).sort((a, b) => b - a);

  const currentSeason =
    seasonParam || (seasons[0] ? seasons[0].toString() : "");

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 md:px-8">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Advanced Stats</h1>
          <p className="text-xs text-muted-foreground">
            League-wide team offense built from play-by-play. Click a plays
            count to see the underlying snaps (plays view is stubbed for now).
          </p>
        </div>
        <Badge variant="outline">Beta</Badge>
      </div>

      <Tabs value="offense" className="w-full">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="offense">Team Offense</TabsTrigger>
          <TabsTrigger value="defense" disabled>
            Team Defense (soon)
          </TabsTrigger>
          <TabsTrigger value="special" disabled>
            Special Teams (soon)
          </TabsTrigger>
          <TabsTrigger value="players" disabled>
            Players (soon)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="offense" className="mt-4">
          <OffenseSection
            rows={rows}
            groupBy={groupBy}
            season={currentSeason}
            seasons={seasons}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OffenseSection(props: {
  rows: TeamOffenseRow[];
  groupBy: string;
  season: string;
  seasons: number[];
}) {
  const { rows, groupBy, season, seasons } = props;

  const sorted = [...rows].sort((a, b) => {
    const ay = a.total_yards ?? 0;
    const by = b.total_yards ?? 0;
    if (by !== ay) return by - ay;
    const an = a.team_name ?? a.team_id;
    const bn = b.team_name ?? b.team_id;
    return an.localeCompare(bn);
  });

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-base font-semibold">
            Team Offense — {season || "All Seasons"} (Totals)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            View shows team totals for the selected season. Other breakdowns
            (by week, quarter, QB, RB) will be added next.
          </p>
        </div>

        <form className="flex flex-wrap items-center gap-2" method="get">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Season</span>
            <select
              name="season"
              defaultValue={season}
              className="rounded-md border px-2 py-1 text-xs"
            >
              <option value="">All</option>
              {seasons.map((s) => (
                <option key={s} value={s.toString()}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">View</span>
            <select
              name="groupBy"
              defaultValue={groupBy}
              className="rounded-md border px-2 py-1 text-xs"
            >
              <option value="totals">Team Totals</option>
              {/* other options you mentioned will be wired later */}
              {/* <option value="week" disabled>By Week (soon)</option> */}
            </select>
          </div>

          <Button type="submit" size="sm" variant="outline" className="text-xs">
            Apply
          </Button>
        </form>
      </CardHeader>

      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px] text-right">#</TableHead>
              <TableHead>Team</TableHead>
              <TableHead className="text-right">Season</TableHead>
              <TableHead className="text-right">G</TableHead>
              <TableHead className="text-right">Plays</TableHead>
              <TableHead className="text-right">Pass/Run</TableHead>
              <TableHead className="text-right">Yards</TableHead>
              <TableHead className="text-right">Yds/Play</TableHead>
              <TableHead className="text-right">Pass Yds</TableHead>
              <TableHead className="text-right">Rush Yds</TableHead>
              <TableHead className="text-right">3rd&nbsp;Down</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((row, idx) => {
              const plays = row.plays ?? 0;
              const pass = row.pass_plays ?? 0;
              const run = row.run_plays ?? 0;
              const tdAtt = row.third_down_att ?? 0;
              const tdConv = row.third_down_conv ?? 0;
              const tdPct =
                typeof row.third_down_pct === "number"
                  ? row.third_down_pct.toFixed(1)
                  : null;

              const seasonForLink = row.season ?? undefined;
              const playsHref = `/advanced/plays?team=${encodeURIComponent(
                row.team_id
              )}${
                seasonForLink ? `&season=${seasonForLink}` : ""
              }&groupBy=${encodeURIComponent(groupBy)}`;

              return (
                <TableRow key={`${row.team_id}-${row.season}-${idx}`}>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {idx + 1}
                  </TableCell>
                  <TableCell className="text-sm font-medium">
                    {row.team_name ?? row.team_id}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {row.season ?? "-"}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {row.games ?? 0}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {plays > 0 ? (
                      <Link
                        href={playsHref}
                        className="underline-offset-2 hover:underline"
                      >
                        {plays}
                      </Link>
                    ) : (
                      plays
                    )}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {pass}/{run}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {row.total_yards ?? 0}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {typeof row.yards_per_play === "number"
                      ? row.yards_per_play.toFixed(2)
                      : "0.00"}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {row.pass_yards ?? 0}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {row.rush_yards ?? 0}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    {tdConv}/{tdAtt}
                    {tdAtt > 0 && tdPct ? ` (${tdPct}%)` : ""}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
