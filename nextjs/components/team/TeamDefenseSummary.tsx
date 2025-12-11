import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { TeamDefenseSummaryRow } from "@/app/api/teamDefenseSummary/route";

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL) return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return "http://localhost:3000";
}

async function fetchDefense(teamId: string): Promise<TeamDefenseSummaryRow | null> {
  const base = getBaseUrl();

  const res = await fetch(`${base}/api/teamDefenseSummary?teamId=${teamId}`, {
    cache: "no-store",
    next: { revalidate: 0 }
  });

  if (!res.ok) {
    console.error("Failed to fetch defense summary:", await res.text());
    return null;
  }

  const json = await res.json();
  return json.summary ?? null;
}

export async function TeamDefenseSummary({ teamId }: { teamId: string }) {
  const summary = await fetchDefense(teamId);

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Defense Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No defensive summary available.</p>
        </CardContent>
      </Card>
    );
  }

  const {
    team_name,
    season,
    games,
    plays_defended,
    pass_plays_defended,
    run_plays_defended,
    sacks_made,
    yards_allowed,
    pass_yards_allowed,
    rush_yards_allowed,
    yards_per_play_allowed,
    pass_yards_per_game_allowed,
    rush_yards_per_game_allowed,
    third_down_att_def,
    third_down_conv_def,
    third_down_pct_def
  } = summary;

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-semibold">
            {team_name || summary.team_id}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Season {season ?? "-"} · {games ?? 0} games
          </p>
        </div>
        <Badge variant="outline">Defense Overview</Badge>
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
              <TableCell>Plays Defended</TableCell>
              <TableCell className="text-right">{plays_defended ?? 0}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Pass / Run Defended</TableCell>
              <TableCell className="text-right">
                {(pass_plays_defended ?? 0)} / {(run_plays_defended ?? 0)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Yards Allowed</TableCell>
              <TableCell className="text-right">{yards_allowed ?? 0}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Pass Yds/Game Allowed</TableCell>
              <TableCell className="text-right">
                {pass_yards_per_game_allowed?.toFixed(1) ?? "0.0"}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Rush Yds/Game Allowed</TableCell>
              <TableCell className="text-right">
                {rush_yards_per_game_allowed?.toFixed(1) ?? "0.0"}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Yards/Play Allowed</TableCell>
              <TableCell className="text-right">
                {yards_per_play_allowed?.toFixed(2) ?? "0.00"}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Sacks Made</TableCell>
              <TableCell className="text-right">{sacks_made ?? 0}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>3rd Down Stops</TableCell>
              <TableCell className="text-right">
                {(third_down_conv_def ?? 0)}/{third_down_att_def ?? 0}
                {typeof third_down_pct_def === "number"
                  ? ` (${third_down_pct_def.toFixed(1)}%)`
                  : ""}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
