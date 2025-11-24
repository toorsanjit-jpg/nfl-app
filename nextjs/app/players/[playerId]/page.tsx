import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type PlayerPageProps = {
  params: Promise<{ playerId: string }>;
};

export default async function PlayerPage({ params }: PlayerPageProps) {
  // Next.js 16: params is a Promise, so we must await it
  const { playerId } = await params;

  // 1) Load basic player info
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("*")
    .eq("id", playerId)
    .maybeSingle();

  if (playerError) {
    console.error("Player fetch error:", playerError);
  }

  if (!player) {
    return <div className="p-10 text-xl">Player not found.</div>;
  }

  // 2) Load stats for this player
  const { data: stats, error: statsError } = await supabase
    .from("player_game_stats")
    .select("*")
    .eq("player_id", playerId)
    .order("game_id", { ascending: true });

  if (statsError) {
    console.error("Player stats fetch error:", statsError);
  }

  // 3) Load games (to enrich with opponent + date + season)
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("*");

  if (gamesError) {
    console.error("Games fetch error:", gamesError);
  }

  const gameLookup: Record<string, any> = {};
  for (const g of games || []) {
    gameLookup[g.id] = g;
  }

  // Determine the most recent season this player appears in
  let latestSeason: number | null = null;
  for (const row of stats || []) {
    const g = gameLookup[row.game_id];
    if (g?.season != null) {
      const s = g.season as number;
      if (latestSeason === null || s > latestSeason) {
        latestSeason = s;
      }
    }
  }

  // Filter stats down to only that latest season
  const seasonFilteredStats = (stats || []).filter((row: any) => {
    if (!latestSeason) return true; // fallback: if no season info, keep all
    const g = gameLookup[row.game_id];
    return g?.season === latestSeason;
  });

  // 4) Compute season totals from stats_parsed JSON across all rows
  const totals: Record<string, number> = {};
  for (const row of seasonFilteredStats || []) {
    const parsed = row.stats_parsed || {};
    for (const key in parsed) {
      const val = parsed[key];
      if (typeof val === "number") {
        totals[key] = (totals[key] || 0) + val;
      }
    }
  }

  // Determine a consistent column order for per-game table
  const sampleParsed =
    (seasonFilteredStats &&
      seasonFilteredStats.length > 0 &&
      seasonFilteredStats[0].stats_parsed) || {};
  const statKeys = Object.keys(sampleParsed);

  return (
    <div className="p-10 space-y-8 max-w-6xl mx-auto">
      {/* Player Header */}
      <div className="flex items-center gap-6">
        {player.headshot_url && (
          <img
            src={player.headshot_url as string}
            className="w-24 h-24 rounded-full border object-cover"
            alt={player.name}
          />
        )}

        <div>
          <h1 className="text-3xl font-bold">{player.name}</h1>
          <p className="text-gray-600">
            {player.position || "Position N/A"}{" "}
            {player.current_team_id && (
              <>
                {" — "}
                <Link href={`/teams/${player.current_team_id}`}>
                  <span className="text-blue-500 hover:underline">
                    {player.current_team_id}
                  </span>
                </Link>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Season Totals */}
      <div>
        <p className="text-sm text-gray-500 mb-1">
          Showing stats for season: {latestSeason ?? "All available"}
        </p>
        <h2 className="text-2xl font-semibold mb-3">Season Totals</h2>

        {Object.keys(totals).length === 0 ? (
          <p className="text-gray-500 text-sm">
            No numeric stats available for this player yet.
          </p>
        ) : (
          <table className="min-w-full border text-sm">
            <thead className="bg-gray-100">
              <tr>
                {Object.keys(totals).map((key) => (
                  <th key={key} className="p-2 border text-center">
                    {key}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <tr>
                {Object.keys(totals).map((key) => (
                  <td key={key} className="p-2 border text-center">
                    {totals[key]}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Per Game Log */}
      <div>
        <h2 className="text-2xl font-semibold mb-3">Game Log</h2>

        {!seasonFilteredStats || seasonFilteredStats.length === 0 ? (
          <p className="text-gray-500 text-sm">
            No game log entries for this player yet.
          </p>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-sm border-collapse">
              <thead className="bg-gray-900 text-white">
                <tr>
                  <th className="p-2 border">Game</th>
                  <th className="p-2 border">Date</th>
                  <th className="p-2 border">Opponent</th>
                  <th className="p-2 border">Category</th>
                  {statKeys.map((key) => (
                    <th key={key} className="p-2 border">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {seasonFilteredStats.map((row: any) => {
                  const g = gameLookup[row.game_id];
                  const date = g?.date
                    ? new Date(g.date).toLocaleDateString()
                    : "";

                  const isHome = g?.home_team_id === row.team_id;
                  const opp = isHome
                    ? g?.away_team_id
                    : g?.home_team_id;

                  return (
                    <tr
                      key={row.id}
                      className="border-b hover:bg-gray-50 transition"
                    >
                      <td className="p-2 border">
                        <Link href={`/games/${row.game_id}`}>
                          <span className="text-blue-500 hover:underline">
                            {row.game_id}
                          </span>
                        </Link>
                      </td>
                      <td className="p-2 border">{date}</td>
                      <td className="p-2 border">
                        {isHome ? "vs" : "@"} {opp || "—"}
                      </td>
                      <td className="p-2 border">
                        {row.category || "—"}
                      </td>

                      {statKeys.map((key) => (
                        <td
                          key={key}
                          className="p-2 border text-center"
                        >
                          {row.stats_parsed?.[key] ?? "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

