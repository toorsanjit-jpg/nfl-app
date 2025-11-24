import { supabase } from "./supabaseClient";

export async function getTeamAggregates() {
  const { data, error } = await supabase
    .from("team_game_stats")
    .select("*");

  if (error) {
    console.error("Failed to load team stats:", error);
    return [];
  }

  // Group rows by team_id
  const grouped: Record<string, any[]> = {};

  for (const row of data) {
    if (!grouped[row.team_id]) grouped[row.team_id] = [];
    grouped[row.team_id].push(row);
  }

  // Compute aggregate season stats
  const aggregates = Object.entries(grouped).map(([teamId, games]) => {
    const numGames = games.length;

    const sum = (key: string) =>
      games.reduce((acc, g) => acc + (parseFloat(g[key]) || 0), 0);

    const pctAvg = (key: string) => {
      const vals = games.map((g) => parseFloat(g[key]) || 0);
      const valid = vals.filter((v) => v > 0);
      if (!valid.length) return 0;
      return valid.reduce((a, b) => a + b, 0) / valid.length;
    };

    return {
      team_id: teamId,
      games: numGames,
      points_per_game: sum("points") / numGames,
      yards_per_game:
        (sum("passing_yards") + sum("rushing_yards")) / numGames,
      passing_yards_per_game: sum("passing_yards") / numGames,
      rushing_yards_per_game: sum("rushing_yards") / numGames,
      yards_per_play_avg: pctAvg("yards_per_play"),
      third_down_eff_avg: pctAvg("third_down_eff"),
      fourth_down_eff_avg: pctAvg("fourth_down_eff"),
      turnovers_per_game: sum("turnovers") / numGames,
      sacks_per_game: sum("sacks") / numGames,
      time_of_possession_avg: sum("time_of_possession") / numGames,
    };
  });

  return aggregates;
}
