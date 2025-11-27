// app/live/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Game = {
  id: string;
  shortName: string;
  competitions: {
    competitors: {
      team: { displayName: string; logo: string };
      score: string;
      homeAway: "home" | "away";
    }[];
    status: {
      type: {
        name: string;
        state: string;
        completed: boolean;
      };
      period: number;
      displayClock: string;
    };
  }[];
};

export default function LiveGames() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadGames() {
      try {
        const res = await fetch(
          "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
        );
        const data = await res.json();
        setGames(data.events);
      } catch (err) {
        console.error("Error fetching games:", err);
      }
      setLoading(false);
    }

    loadGames();
    const interval = setInterval(loadGames, 15000); // refresh every 15 sec
    return () => clearInterval(interval);
  }, []);

  if (loading)
    return (
      <div className="p-12 text-center text-black/60">Loading live games...</div>
    );

  return (
    <main className="min-h-screen p-6 bg-[#F7F7F7] text-[#0A0A0A]">
      <h1 className="text-3xl font-bold mb-6">Live NFL Games</h1>

      {games.length === 0 && (
        <p className="text-black/60">No live or recent games available.</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {games.map((game) => {
          const comp = game.competitions[0];
          const home = comp.competitors.find((c) => c.homeAway === "home")!;
          const away = comp.competitors.find((c) => c.homeAway === "away")!;

          return (
            <Link
              key={game.id}
              href={`/game/${game.id}`}
              className="bg-white border border-black/10 p-6 rounded-xl shadow-sm hover:shadow-md transition"
            >
              <p className="text-lg font-semibold mb-3">{game.shortName}</p>

              {/* Teams */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <img src={away.team.logo} alt="" className="w-10 h-10" />
                  <span>{away.team.displayName}</span>
                </div>
                <span className="text-xl font-bold">{away.score}</span>
              </div>

              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <img src={home.team.logo} alt="" className="w-10 h-10" />
                  <span>{home.team.displayName}</span>
                </div>
                <span className="text-xl font-bold">{home.score}</span>
              </div>

              {/* Game State */}
              <p className="text-black/50 text-sm">
                {comp.status.type.state === "pre"
                  ? "Not Started"
                  : comp.status.type.completed
                  ? "Final"
                  : `Q${comp.status.period} - ${comp.status.displayClock}`}
              </p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
