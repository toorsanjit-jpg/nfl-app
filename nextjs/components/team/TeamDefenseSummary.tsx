import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { TeamDefenseSummaryDTO } from "@/types/TeamDefenseSummary";

export function TeamDefenseSummary({ summary }: { summary: TeamDefenseSummaryDTO }) {
  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Defense Summary</CardTitle>
        </CardHeader>
        <CardContent>No data available.</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{summary.team_name || summary.team_id} — Defense</CardTitle>
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
            <TableRow><TableCell>Plays Allowed</TableCell><TableCell className="text-right">{summary.plays_allowed}</TableCell></TableRow>
            <TableRow><TableCell>Yards Allowed</TableCell><TableCell className="text-right">{summary.yards_allowed}</TableCell></TableRow>
            <TableRow><TableCell>Pass Yards Allowed</TableCell><TableCell className="text-right">{summary.pass_yards_allowed}</TableCell></TableRow>
            <TableRow><TableCell>Rush Yards Allowed</TableCell><TableCell className="text-right">{summary.rush_yards_allowed}</TableCell></TableRow>
            <TableRow><TableCell>Sacks</TableCell><TableCell className="text-right">{summary.sacks}</TableCell></TableRow>
            <TableRow><TableCell>Interceptions</TableCell><TableCell className="text-right">{summary.interceptions}</TableCell></TableRow>
            <TableRow><TableCell>Fumbles Recovered</TableCell><TableCell className="text-right">{summary.fumbles_recovered}</TableCell></TableRow>
            <TableRow><TableCell>Total Turnovers</TableCell><TableCell className="text-right">{summary.turnovers_forced}</TableCell></TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
