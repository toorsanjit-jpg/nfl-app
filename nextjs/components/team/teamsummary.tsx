// nextjs/components/team/teamsummary.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

type TeamSummaryRow = {
  team_id: string;
  team_name: string | null;
  season: number | null;
  games: number | null;
  plays: number | null;
  pass_plays: number | null;
  run_plays: number | null;
  sacks_taken: number | null;
  total_yards: number | null;
  pass_yards: number | null;
  rush_yards: number | null;
  yards_per_play: number | null;
  pass_yards_per_game: number | null;
  rush_yards_per_game: number | null;
  third_down_att: number | null;
  third_down_conv: number | null;
  third_down_pct: number | null;
};

async function fetchTeamSummary(teamId: string): Promise<TeamSummaryRow | null> {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  const res = await fetch(
    `${base}/api/teamSummary?teamId=${encodeURIComponent(teamId)}`,
    {
      cache: "no-store",
      // ensure this call always goes to the server, no static cache
      next: { revalidate: 0 },
    }
  );

  if (!res.ok) {
    console.error("Failed to fetch team summary", await res.text());
    return null;
  }

  const json = (await res.json()) as { summary: TeamSummaryRow | null };
  return json.summary;
}

export async function TeamSummary({ teamId }: { teamId: string }) {
  const summary = await fetchTeamSummary(teamId);

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            No summary data available for this team yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const {
    team_name,
    season,
    games,
    plays,
    pass_plays,
    run_plays,
    sacks_taken,
    total_yards,
    pass_yards,
    rush_yards,
    yards_per_play,
    pass_yards_per_game,
    rush_yards_per_game,
    third_down_att,
    third_down_conv,
    third_down_pct,
  } = summary;

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-semibold">
            {team_name || summary.team_id}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Season {season ?? "-"} · {games ?? 0} games
          </p>
        </div>
        <Badge variant="outline">
          Offense Overview
        </Badge>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stat</TableHead>
              <TableHead className="text-right">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>Plays</TableCell>
              <TableCell className="text-right">{plays ?? 0}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Pass / Run</TableCell>
              <TableCell className="text-right">
                {(pass_plays ?? 0)} / {(run_plays ?? 0)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Total Yards</TableCell>
              <TableCell className="text-right">
                {total_yards ?? 0}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Pass Yards / Game</TableCell>
              <TableCell className="text-right">
                {pass_yards_per_game?.toFixed(1) ?? "0.0"}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Rush Yards / Game</TableCell>
              <TableCell className="text-right">
                {rush_yards_per_game?.toFixed(1) ?? "0.0"}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Yards / Play</TableCell>
              <TableCell className="text-right">
                {yards_per_play?.toFixed(2) ?? "0.00"}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Sacks Taken</TableCell>
              <TableCell className="text-right">
                {sacks_taken ?? 0}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>3rd Down</TableCell>
              <TableCell className="text-right">
                {(third_down_conv ?? 0)}/{third_down_att ?? 0}
                {typeof third_down_pct === "number"
                  ? ` (${third_down_pct.toFixed(1)}%)`
                  : ""}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
