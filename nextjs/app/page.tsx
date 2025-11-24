"use server";

import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

export default async function HomePage() {
  // Load team metadata
  const { data: teams } = await supabase
    .from("teams")
    .select("id, display_name, logo");

  // Load all games + team stats
  const { data: teamStats } = await supabase
    .from("team_game_stats")
    .select("*");

  const { data: games } = await supabase.from("games").select("*");

  if (!teams || !teamStats || !games) {
    return <div className="p-10 text-xl">No data found.</div>;
  }

  // Aggregate stats per team
  const totals: Record<string, any> = {};

  for (const team of teams) {
    totals[team.id] = {
      team: team,
      gamesPlayed: 0,
      pointsFor: 0,
      pointsAllowed: 0,
      totalYards: 0,
      passingYards: 0,
      rushingYards: 0,
      turnovers: 0,
      record: { wins: 0, losses: 0 },
    };
  }

  // Merge stats from team_game_stats + games table
  for (const game of games) {
    const home = game.home_team_id;
    const away = game.away_team_id;

    const homeStats = teamStats.find(
      (s: any) => s.game_id === game.id && s.team_id === home
    );
    const awayStats = teamStats.find(
      (s: any) => s.game_id === game.id && s.team_id === away
    );

    if (homeStats) {
      const t = totals[home];
      t.gamesPlayed++;
      t.pointsFor += homeStats.points || 0;
      t.pointsAllowed += awayStats?.points || 0;
      t.totalYards += homeStats.total_yards || 0;
      t.passingYards += homeStats.passing_yards || 0;
      t.rushingYards += homeStats.rushing_yards || 0;
      t.turnovers += homeStats.turnovers || 0;

      if (homeStats.points > (awayStats?.points || 0)) t.record.wins++;
      else t.record.losses++;
    }

    if (awayStats) {
      const t = totals[away];
      t.gamesPlayed++;
      t.pointsFor += awayStats.points || 0;
      t.pointsAllowed += homeStats?.points || 0;
      t.totalYards += awayStats.total_yards || 0;
      t.passingYards += awayStats.passing_yards || 0;
      t.rushingYards += awayStats.rushing_yards || 0;
      t.turnovers += awayStats.turnovers || 0;

      if (awayStats.points > (homeStats?.points || 0)) t.record.wins++;
      else t.record.losses++;
    }
  }

  const rows = Object.values(totals);

  return (
    <div className="p-10">
      <h1 className="text-3xl font-bold mb-6">NFL Team Dashboard</h1>

      <table className="min-w-full border text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 text-left">Team</th>
            <th className="p-3 text-right">GP</th>
            <th className="p-3 text-right">PF</th>
            <th className="p-3 text-right">PA</th>
            <th className="p-3 text-right">Yards</th>
            <th className="p-3 text-right">Pass</th>
            <th className="p-3 text-right">Rush</th>
            <th className="p-3 text-right">TO</th>
            <th className="p-3 text-right">Record</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row: any) => (
            <tr
              key={row.team.id}
              className="border-b hover:bg-gray-50 transition cursor-pointer"
            >
              <td className="p-3">
                <Link href={`/teams/${row.team.id}`}>
                  <div className="flex items-center gap-2">
                    {row.team.logo && (
                      <img
                        src={row.team.logo}
                        className="w-6 h-6 rounded"
                        alt={row.team.display_name}
                      />
                    )}
                    {row.team.display_name}
                  </div>
                </Link>
              </td>

              <td className="p-3 text-right">{row.gamesPlayed}</td>
              <td className="p-3 text-right">{row.pointsFor}</td>
              <td className="p-3 text-right">{row.pointsAllowed}</td>
              <td className="p-3 text-right">{row.totalYards}</td>
              <td className="p-3 text-right">{row.passingYards}</td>
              <td className="p-3 text-right">{row.rushingYards}</td>
              <td className="p-3 text-right">{row.turnovers}</td>
              <td className="p-3 text-right">
                {row.record.wins}-{row.record.losses}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
