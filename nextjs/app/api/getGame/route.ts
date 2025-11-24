import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId");

    if (!gameId) {
      return NextResponse.json({ error: "Missing gameId" }, { status: 400 });
    }

    // Fetch game
    const { data: game, error: gameError } = await supabase
      .from("games")
      .select("*")
      .eq("id", gameId)
      .single();

    if (gameError) {
      throw new Error(gameError.message);
    }

    // Fetch team stats
    const { data: teamStats, error: teamStatsError } = await supabase
      .from("team_game_stats")
      .select("*")
      .eq("game_id", gameId);

    if (teamStatsError) {
      throw new Error(teamStatsError.message);
    }

    // Fetch player stats
    const { data: playerStats, error: playerStatsError } = await supabase
      .from("player_game_stats")
      .select("*")
      .eq("game_id", gameId);

    if (playerStatsError) {
      throw new Error(playerStatsError.message);
    }

    return NextResponse.json({
      game,
      teamStats,
      playerStats,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

