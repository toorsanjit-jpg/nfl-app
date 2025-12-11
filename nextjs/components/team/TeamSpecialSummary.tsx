import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

import type { TeamSpecialSummaryDTO } from "@/types/TeamSpecialSummary";

export function TeamSpecialSummary({ summary }: { summary: TeamSpecialSummaryDTO }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Special Teams Overview</CardTitle>
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
              <TableCell>FG Made / Att</TableCell>
              <TableCell className="text-right">
                {summary.fg_made}/{summary.fg_att}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>XP Made / Att</TableCell>
              <TableCell className="text-right">
                {summary.xp_made}/{summary.xp_att}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Punts</TableCell>
              <TableCell className="text-right">{summary.punts}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Punt Avg</TableCell>
              <TableCell className="text-right">{summary.punt_avg}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Kick Return Yards</TableCell>
              <TableCell className="text-right">{summary.kr_yds}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Punt Return Yards</TableCell>
              <TableCell className="text-right">{summary.pr_yds}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Special Teams Points</TableCell>
              <TableCell className="text-right">{summary.st_points}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
