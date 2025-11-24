import { supabase } from "@/lib/supabaseClient";

type Team = {
  id: string; // abbreviation, e.g. "TB"
  name: string | null;
  display_name: string | null;
  location: string | null;
  logo: string | null;
};

type Game = {
  id: string;
  season: number | null;
  week: number | null;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  date: string | null;
};

type TeamGameStat = {
  game_id: string;
  team_id: string;
  points: number | null;
  total_yards: number | null;
  passing_yards: number | null;
  rushing_yards: number | null;
};

type TeamPageProps = {
  params: Promise<{ teamId: string }>;
};

function computeRecord(games: Game[], teamId: string) {
  let wins = 0;
  let losses = 0;
  let ties = 0;

  for (const g of games) {
    const isHome = g.home_team_id === teamId;
    const teamScore = isHome ? g.home_score ?? 0 : g.away_score ?? 0;
    const oppScore = isHome ? g.away_score ?? 0 : g.home_score ?? 0;

    if (teamScore > oppScore) wins += 1;
    else if (teamScore < oppScore) losses += 1;
    else ties += 1;
  }

  return { wins, losses, ties };
}

export default async function TeamPage({ params }: TeamPageProps) {
  // Next.js 16: params is a Promise, must await
  const { teamId } = await params;
  const teamAbbr = teamId.toUpperCase();

  // 1) Load team info
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamAbbr)
    .maybeSingle();

  if (teamError) {
    console.error("Team fetch error:", teamError);
  }

  // 2) Load all games where this team played
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("*")
    .or(`home_team_id.eq.${teamAbbr},away_team_id.eq.${teamAbbr}`)
    .order("date", { ascending: true });

  if (gamesError) {
    console.error("Games fetch error:", gamesError);
  }

  const gameList: Game[] = games || [];
  const gameIds = gameList.map((g) => g.id);

  // 3) Load team-game stats for this team in those games
  let teamStats: TeamGameStat[] = [];
  if (gameIds.length > 0) {
    const { data: statsData, error: statsError } = await supabase
      .from("team_game_stats")
      .select("game_id, team_id, points, total_yards, passing_yards, rushing_yards")
      .in("game_id", gameIds)
      .eq("team_id", teamAbbr);

    if (statsError) {
      console.error("Team stats fetch error:", statsError);
    } else {
      teamStats = statsData || [];
    }
  }

  // Load full team metadata
  const { data: allTeams } = await supabase
    .from("teams")
    .select("id, display_name");

  // Map stats by game_id for quick lookup
  const statsByGameId: Record<string, TeamGameStat> = {};
  for (const s of teamStats) {
    statsByGameId[s.game_id] = s;
  }

  // 4) Compute season aggregates
  const numGames = teamStats.length;
  const totalPoints = teamStats.reduce(
    (sum, s) => sum + (s.points ?? 0),
    0
  );
  const totalYards = teamStats.reduce(
    (sum, s) =>
      sum +
      ((s.passing_yards ?? 0) + (s.rushing_yards ?? 0)),
    0
  );
  const totalPassYards = teamStats.reduce(
    (sum, s) => sum + (s.passing_yards ?? 0),
    0
  );
  const totalRushYards = teamStats.reduce(
    (sum, s) => sum + (s.rushing_yards ?? 0),
    0
  );

  const { wins, losses, ties } = computeRecord(gameList, teamAbbr);

  const ppg = numGames ? totalPoints / numGames : 0;
  const ypg = numGames ? totalYards / numGames : 0;
  const passYpg = numGames ? totalPassYards / numGames : 0;
  const rushYpg = numGames ? totalRushYards / numGames : 0;

  function getTeamName(abbr: string) {
    return allTeams?.find((t: Team) => t.id === abbr)?.display_name || abbr;
  }

  const displayName =
    (team as Team | null)?.display_name ||
    (team as Team | null)?.name ||
    teamAbbr;

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-8">
      {/* Team Header */}
      <div className="flex items-center gap-6">
        {team && (team as Team).logo && (
          <img
            src={(team as Team).logo as string}
            alt={displayName}
            className="w-20 h-20 object-contain"
          />
        )}
        <div>
          <h1 className="text-3xl font-bold">
            {displayName} ({teamAbbr})
          </h1>
          <p className="text-gray-600">
            Record: {wins}-{losses}
            {ties > 0 ? `-${ties}` : ""} • Games: {numGames}
          </p>
          <p className="text-gray-600">
            Points/Game: {ppg.toFixed(1)} • Yards/Game:{" "}
            {ypg.toFixed(1)} • Pass YPG: {passYpg.toFixed(1)} •
            Rush YPG: {rushYpg.toFixed(1)}
          </p>
        </div>
      </div>

      {/* Future Filters Bar (placeholder for now) */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <p className="font-semibold mb-2">View Stats By (coming soon):</p>
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="px-3 py-1 rounded-full bg-gray-200">
            Week (default)
          </span>
          <span className="px-3 py-1 rounded-full bg-gray-100">
            Quarter
          </span>
          <span className="px-3 py-1 rounded-full bg-gray-100">
            Down &amp; Distance
          </span>
          <span className="px-3 py-1 rounded-full bg-gray-100">
            Distance to Goal
          </span>
          <span className="px-3 py-1 rounded-full bg-gray-100">
            Redzone vs Non-redzone
          </span>
          <span className="px-3 py-1 rounded-full bg-gray-100">
            Play Type
          </span>
          <span className="px-3 py-1 rounded-full bg-gray-100">
            QB Hit on Throw
          </span>
          <span className="px-3 py-1 rounded-full bg-gray-100">
            By Player
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Right now this page shows stats by week. We’ll wire up
          these filters using the plays table next.
        </p>
      </div>

      {/* Season Game Log */}
      <div className="space-y-3">
        <h2 className="text-2xl font-semibold">Season Game Log</h2>
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-gray-900 text-white">
              <tr>
                <th className="p-3">Week</th>
                <th className="p-3">Date</th>
                <th className="p-3">Opponent</th>
                <th className="p-3">Result</th>
                <th className="p-3">Score</th>
                <th className="p-3">Total Yds</th>
                <th className="p-3">Pass</th>
                <th className="p-3">Rush</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {gameList.map((g) => {
                const isHome = g.home_team_id === teamAbbr;
                const opponentId = isHome
                  ? g.away_team_id
                  : g.home_team_id;
                const teamScore = isHome
                  ? g.home_score ?? 0
                  : g.away_score ?? 0;
                const oppScore = isHome
                  ? g.away_score ?? 0
                  : g.home_score ?? 0;

                const result =
                  teamScore > oppScore
                    ? "W"
                    : teamScore < oppScore
                    ? "L"
                    : "T";

                const stats = statsByGameId[g.id];

                const date = g.date
                  ? new Date(g.date).toLocaleDateString()
                  : "";

                return (
                  <tr key={g.id} className="border-b border-gray-200">
                    <td className="p-3">{g.week ?? "-"}</td>
                    <td className="p-3">{date}</td>
                    <td className="p-3">
                      {isHome ? "vs" : "@"} {getTeamName(opponentId)}
                    </td>
                    <td className="p-3 font-semibold">{result}</td>
                    <td className="p-3">
                      {teamScore}–{oppScore}
                    </td>
                    <td className="p-3">
                      {stats
                        ? (stats.total_yards ??
                           ((stats.passing_yards ?? 0) +
                            (stats.rushing_yards ?? 0)))
                        : "-"}
                    </td>
                    <td className="p-3">
                      {stats?.passing_yards ?? "-"}
                    </td>
                    <td className="p-3">
                      {stats?.rushing_yards ?? "-"}
                    </td>
                    <td className="p-3">
                      <a
                        href={`/games/${g.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        View game
                      </a>
                    </td>
                  </tr>
                );
              })}

              {gameList.length === 0 && (
                <tr>
                  <td
                    className="p-4 text-center text-gray-500"
                    colSpan={9}
                  >
                    No games found for this team yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
