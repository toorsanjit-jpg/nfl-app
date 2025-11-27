"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Play = {
  game_id: number;
  play_id: number | null;
  sequence_number: number | null;
  quarter: number | null;
  clock: string | null;
  description: string | null;
  offense_team: string | null;
  defense_team: string | null;
  down: number | null;
  distance: number | null;
  down_distance_text: string | null;
  scoring_play: boolean | null;
};

export default function GamePage({ params }: { params: { gameId: string } }) {
  const { gameId } = params;

  const [plays, setPlays] = useState<Play[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadPlays() {
      setLoading(true);
      setErrorMsg(null);

      const numericGameId = Number(gameId);

      const { data, error } = await supabase
        .from("nfl_plays") // all lowercase
        .select(
          `
          game_id,
          play_id,
          sequence_number,
          quarter,
          clock,
          description,
          offense_team,
          defense_team,
          down,
          distance,
          down_distance_text,
          scoring_play
        `
        )
        .eq("game_id", numericGameId)
        .order("quarter", { ascending: true })
        .order("sequence_number", { ascending: true });

      if (error) {
        console.error("Error loading plays:", error);
        setErrorMsg(error.message);
      } else {
        setPlays((data as Play[]) || []);
      }

      setLoading(false);
    }

    loadPlays();
  }, [gameId]);

  if (loading) {
    return (
      <div className="p-12 text-center text-black/50">
        Loading play-by-play for game {gameId}...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-12 text-center text-red-600">
        Error loading data: {errorMsg}
      </div>
    );
  }

  if (!plays.length) {
    return (
      <main className="min-h-screen bg-[#F7F7F7] text-[#0A0A0A] p-6">
        <Link
          href="/live"
          className="inline-block mb-4 px-4 py-2 bg-black/10 border border-black/20 rounded-lg"
        >
          ← Back to Live Games
        </Link>
        <h1 className="text-3xl font-bold mb-4">
          Game Play-By-Play: {gameId}
        </h1>
        <p className="text-black/60">
          No plays found in <code>nfl_plays</code> for this game yet.
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F7F7] text-[#0A0A0A] p-6">
      <Link
        href="/live"
        className="inline-block mb-4 px-4 py-2 bg-black/10 border border-black/20 rounded-lg"
      >
        ← Back to Live Games
      </Link>

      <h1 className="text-3xl font-bold mb-6">
        Game Play-By-Play: {gameId}
      </h1>

      <div className="space-y-4">
        {plays.map((play, idx) => {
          const ddText =
            play.down_distance_text ||
            (play.down != null && play.distance != null
              ? `${play.down} & ${play.distance}`
              : null);

          return (
            <div
              key={play.play_id ?? idx}
              className="bg-white p-4 rounded-xl border border-black/10 shadow-sm"
            >
              <div className="flex justify-between items-center mb-1">
                <p className="text-black/50 text-sm">
                  Q{play.quarter ?? "-"}
                  {play.clock ? ` — ${play.clock}` : ""}
                </p>
                <p className="text-black/50 text-xs">
                  {play.offense_team} vs {play.defense_team}
                </p>
              </div>

              {ddText && (
                <p className="font-semibold mb-1">
                  {ddText}
                </p>
              )}

              <p>{play.description}</p>

              {play.scoring_play && (
                <p className="text-green-600 font-semibold text-sm mt-2">
                  SCORING PLAY
                </p>
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
