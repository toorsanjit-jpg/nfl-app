"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// ---- Types ---- //
interface Play {
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
}

// ---- Component ---- //
export default function GamePage() {
  const params = useParams<{ gameId: string }>();

  // Safely extract & convert the param
  const gameIdStr = params?.gameId ?? null;
  const gameId = gameIdStr ? Number(gameIdStr) : NaN;

  const [plays, setPlays] = useState<Play[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- LOAD PLAYS FROM SUPABASE ---- //
  useEffect(() => {
    // If param is missing or invalid
    if (!gameIdStr || isNaN(gameId)) {
      setError(`Invalid game ID: ${gameIdStr ?? "undefined"}`);
      setLoading(false);
      return;
    }

    async function fetchPlays() {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("nfl_plays")
        .select("*")
        .eq("game_id", gameId)
        .order("quarter", { ascending: true })
        .order("sequence_number", { ascending: true });

      if (error) {
        setError(error.message);
      } else {
        setPlays((data as Play[]) || []);
      }

      setLoading(false);
    }

    fetchPlays();
  }, [gameId, gameIdStr]);

  // ---- UI STATES ---- //

  if (loading) {
    return <PageWrap>Loading play-by-play…</PageWrap>;
  }

  if (error) {
    return <PageWrap>Error: {error}</PageWrap>;
  }

  if (plays.length === 0) {
    return (
      <PageWrap>
        <BackButton />
        <h1 className="text-3xl font-bold mb-2">Game {gameIdStr}</h1>
        <p>No plays found in <code>nfl_plays</code> for this game.</p>
      </PageWrap>
    );
  }

  // ---- MAIN PAGE ---- //

  return (
    <PageWrap>
      <BackButton />
      <h1 className="text-3xl font-bold mb-6">Game {gameIdStr}</h1>

      <div className="space-y-4">
        {plays.map((p, i) => (
          <PlayCard key={p.play_id || i} play={p} />
        ))}
      </div>
    </PageWrap>
  );
}

// ---- Reusable Components ---- //

function PageWrap({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-[#F7F7F7] text-[#0A0A0A] p-6">
      {children}
    </main>
  );
}

function BackButton() {
  return (
    <Link
      href="/live"
      className="inline-block mb-4 px-4 py-2 bg-black/10 border border-black/20 rounded-lg"
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
    <div className="bg-white p-4 rounded-xl border border-black/10 shadow-sm">
      {/* Top Row */}
      <div className="flex justify-between items-center mb-1">
        <p className="text-black/50 text-sm">
          Q{play.quarter ?? "-"} {play.clock ? `• ${play.clock}` : ""}
        </p>

        <p className="text-black/50 text-xs">
          {play.offense_team} vs {play.defense_team}
        </p>
      </div>

      {/* Down & Distance */}
      {downDist && <p className="font-semibold mb-1">{downDist}</p>}

      {/* Description */}
      <p>{play.description}</p>

      {/* Scoring Play */}
      {play.scoring_play && (
        <p className="text-green-600 font-semibold text-sm mt-2">
          SCORING PLAY
        </p>
      )}
    </div>
  );
}
