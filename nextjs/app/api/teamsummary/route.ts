import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// Shape we expose to the UI
export type TeamSummaryDTO = {
  teamId: string;
  teamName: string;
  teamAbbr: string;
  teamLogo: string | null;
  teamColor: string | null;
  gamesPlayed: number;
  pointsFor: number;
  pointsPerGame: number;
  totalYards: number;
  yardsPerPlay: number;
  passingYards: number;
  rushingYards: number;
  turnovers: number;
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json(
      { error: "Missing teamId" },
      { status: 400 }
    );
  }

  // Team IDs in your DB are all caps like "LV", "DAL", etc.
  const teamKey = teamId.toUpperCase();

  const { data, error } = await supabase.rpc("fn_team_summary", {
    p_team_id: teamKey,
  });

  if (error) {
    console.error("fn_team_summary error:", error);
    return NextResponse.json(
      { error: "Failed to load team summary" },
      { status: 500 }
    );
  }

  if (!data || data.length === 0) {
    return NextResponse.json(
      { error: "Team not found", teamId: teamKey },
      { status: 404 }
    );
  }

  const row = data[0];

  const dto: TeamSummaryDTO = {
    teamId: row.team_id,
    teamName: row.team_name,
    teamAbbr: row.team_abbr,
    teamLogo: row.team_logo ?? null,
    teamColor: row.team_color ?? null,
    gamesPlayed: row.games_played ?? 0,
    pointsFor: row.points_for ?? 0,
    pointsPerGame: Number(row.points_per_game ?? 0),
    totalYards: row.total_yards ?? 0,
    yardsPerPlay: Number(row.yards_per_play ?? 0),
    passingYards: row.passing_yards ?? 0,
    rushingYards: row.rushing_yards ?? 0,
    turnovers: row.turnovers ?? 0,
  };

  return NextResponse.json(dto);
}
