import React from "react";

export default async function GamePage(props: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await props.params;

  if (!gameId) {
    return <div>No game ID provided.</div>;
  }

  // Fetch from your gameSummary API
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_BASE_URL is missing. Set it in Vercel.");
  }

  const response = await fetch(
    `${baseUrl}/api/gameSummary?gameId=${gameId}`,
    { next: { revalidate: 10 } }
  );
  const data = await response.json();

  if (!data || data.error) {
    return <div className="p-6 text-red-500">Game not found or failed to load.</div>;
  }

  const { game, teamStats, playerStats } = data;

  // Helper to pretty print % stats
  const formatPct = (val: any) => {
    if (!val) return "-";
    const num = parseFloat(val);
    return isNaN(num) ? "-" : `${(num * 100).toFixed(1)}%`;
  };

  return (
    <div className="p-8 max-w-6xl mx-auto text-white">
      {/* GAME HEADER CARD */}
      <div className="bg-gray-900 p-6 rounded-2xl shadow-lg mb-10 border border-gray-700">
        <h1 className="text-4xl font-bold mb-2">Game {gameId}</h1>
        <p className="text-gray-300 text-lg">{game.date}</p>

        <div className="flex justify-between items-center mt-6">
          {/* Away Team */}
          <div className="text-center">
            <div className="text-3xl font-bold">{game.away_team_id}</div>
            <div className="text-5xl font-extrabold mt-2">{game.away_score}</div>
          </div>

          {/* VS */}
          <div className="text-xl font-bold text-gray-400">at</div>

          {/* Home Team */}
          <div className="text-center">
            <div className="text-3xl font-bold">{game.home_team_id}</div>
            <div className="text-5xl font-extrabold mt-2">{game.home_score}</div>
          </div>
        </div>
      </div>

      {/* TEAM STATS SECTION */}
      <h2 className="text-3xl font-semibold mb-4">Team Statistics</h2>

      <div className="grid grid-cols-3 gap-6 mb-12">
        {teamStats.map((team: any) => (
          <div
            key={team.team_id}
            className="bg-gray-900 p-5 rounded-2xl shadow-md border border-gray-700"
          >
            <h3 className="text-2xl font-bold mb-3">{team.team_id}</h3>

            <div className="space-y-2 text-gray-300">
              <p><strong>Points:</strong> {team.points}</p>
              <p><strong>First Downs:</strong> {team.first_downs}</p>
              <p><strong>Total Yards:</strong> {team.total_yards ?? "-"}</p>
              <p><strong>Passing Yards:</strong> {team.passing_yards}</p>
              <p><strong>Rushing Yards:</strong> {team.rushing_yards}</p>
              <p><strong>Yards Per Play:</strong> {team.yards_per_play}</p>
              <p><strong>3rd Down %:</strong> {formatPct(team.third_down_eff)}</p>
              <p><strong>4th Down %:</strong> {formatPct(team.fourth_down_eff)}</p>
              <p><strong>Red Zone %:</strong> {formatPct(team.red_zone_eff)}</p>
              <p><strong>Turnovers:</strong> {team.turnovers ?? "-"}</p>
              <p><strong>Sacks:</strong> {team.sacks}</p>
            </div>
          </div>
        ))}
      </div>

      {/* PLAYER STATISTICS */}
      <h2 className="text-3xl font-semibold mb-4">Player Statistics</h2>

      <div className="space-y-10">
        {playerStats.map((player: any) => (
          <div
            key={player.id}
            className="bg-gray-900 p-5 rounded-2xl shadow-lg border border-gray-700"
          >
            <h3 className="text-2xl font-bold mb-2">{player.player_id}</h3>
            <p className="text-gray-400 mb-3">{player.category}</p>

            <pre className="bg-black/40 p-4 rounded-xl text-sm overflow-x-auto">
              {JSON.stringify(player.stats_parsed, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </div>
  );
}
