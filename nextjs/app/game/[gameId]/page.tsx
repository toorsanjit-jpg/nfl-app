"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getBrowserSupabase } from "@/lib/supabaseClient";

type Play = {
  play_id: number | null;
  description: string | null;
  quarter: number | null;
  clock: string | null;
  offense_team: string | null;
  defense_team: string | null;
  down: number | null;
  distance: number | null;
  down_distance_text: string | null;
  scoring_play: boolean | null;
  sequence_number: number | null;
};

export default function GamePage() {
  const params = useParams<{ gameId: string }>();
  const gameIdStr = params?.gameId ?? null;
  const [plays, setPlays] = useState<Play[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const client = getBrowserSupabase();
    if (!client) {
      setError("Supabase is not configured.");
      setLoading(false);
      return;
    }

    const parsedId = gameIdStr ? Number(gameIdStr) : NaN;
    if (!gameIdStr || Number.isNaN(parsedId)) {
      setError(`Invalid game ID: ${gameIdStr ?? "undefined"}`);
      setLoading(false);
      return;
    }

    const fetchPlays = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await client
        .from("nfl_plays")
        .select("*")
        .eq("game_id", parsedId)
        .order("quarter", { ascending: true })
        .order("sequence_number", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setPlays((data as Play[]) || []);
      }

      setLoading(false);
    };

    fetchPlays();
  }, [gameIdStr]);

  if (loading) {
    return <PageWrap>Loading play-by-play...</PageWrap>;
  }

  if (error) {
    return <PageWrap>Error: {error}</PageWrap>;
  }

  if (plays.length === 0) {
    return (
      <PageWrap>
        <BackButton />
        <h1 className="mb-2 text-3xl font-bold">Game {gameIdStr}</h1>
        <p>
          No plays found in <code>nfl_plays</code> for this game.
        </p>
      </PageWrap>
    );
  }

  return (
    <PageWrap>
      <BackButton />
      <h1 className="mb-6 text-3xl font-bold">Game {gameIdStr}</h1>

      <div className="space-y-4">
        {plays.map((play, index) => (
          <PlayCard key={play.play_id || index} play={play} />
        ))}
      </div>
    </PageWrap>
  );
}

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#F7F7F7] p-6 text-[#0A0A0A]">
      {children}
    </main>
  );
}

function BackButton() {
  return (
    <Link
      href="/live"
      className="mb-4 inline-block rounded-lg border border-black/20 bg-black/10 px-4 py-2"
    >
      ← Back to Live Games
    </Link>
  );
}

function PlayCard({ play }: { play: Play }) {
  const downDist =
    play.down_distance_text ||
    (play.down != null && play.distance != null
      ? `${play.down} & ${play.distance}`
      : null);

  return (
    <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <p className="text-sm text-black/50">
          Q{play.quarter ?? "-"} {play.clock ? `- ${play.clock}` : ""}
        </p>

        <p className="text-xs text-black/50">
          {play.offense_team} vs {play.defense_team}
        </p>
      </div>

      {downDist && <p className="mb-1 font-semibold">{downDist}</p>}

      <p>{play.description}</p>

      {play.scoring_play && (
        <p className="mt-2 text-sm font-semibold text-green-600">SCORING PLAY</p>
      )}
    </div>
  );
}
