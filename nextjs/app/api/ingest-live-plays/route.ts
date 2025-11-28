// app/api/ingest-live-plays/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

const RAPID_API_KEY = process.env.RAPID_API_KEY; // we'll set this
const RAPID_API_HOST = "sports-information.p.rapidapi.com";

export async function GET() {
  if (!RAPID_API_KEY) {
    return NextResponse.json(
      { error: "Missing RAPID_API_KEY env var" },
      { status: 500 }
    );
  }

  try {
    // 1) Get live games from ESPN scoreboard
    const espnRes = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
    );
    const espnData = await espnRes.json();

    const events: any[] = espnData?.events || [];

    // Filter for in-progress games only
    const liveGames = events.filter((game) => {
      const comp = game.competitions?.[0];
      const state = comp?.status?.type?.state; // "pre", "in", "post"
      return state === "in"; // live / in-progress
    });

    if (!liveGames.length) {
      return NextResponse.json({
        message: "No live games found. Nothing to ingest.",
      });
    }

    const gameIds = liveGames.map((g) => g.id); // ESPN game IDs like 401772810

    const results: any[] = [];

    // 2) For each live game, fetch play-by-play from RapidAPI and upsert into Supabase
    for (const gameId of gameIds) {
      try {
        const pbpRes = await fetch(
          `https://${RAPID_API_HOST}/nfl/play-by-play/${gameId}`,
          {
            method: "GET",
            headers: {
              "x-rapidapi-key": RAPID_API_KEY,
              "x-rapidapi-host": RAPID_API_HOST,
            },
          }
        );

        if (!pbpRes.ok) {
          console.error(
            `RapidAPI error for game ${gameId}:`,
            pbpRes.status,
            await pbpRes.text()
          );
          results.push({
            gameId,
            status: "rapidapi_error",
            code: pbpRes.status,
          });
          continue;
        }

        const pbpData = await pbpRes.json();

        // You may need to adjust this based on the exact response shape.
        // Common patterns: pbpData.allPlays, pbpData.plays, etc.
        const plays: any[] =
          pbpData?.allPlays || pbpData?.plays || pbpData || [];

        if (!Array.isArray(plays) || !plays.length) {
          results.push({ gameId, status: "no_plays_in_response" });
          continue;
        }

        // Map RapidAPI/ESPN plays into your nfl_plays schema shape (basic fields for now)
        const rowsToUpsert = plays.map((p) => ({
          game_id: Number(gameId),
          play_id: p.id ?? null,
          sequence_number: p.sequenceNumber ?? null,
          quarter: p.period ?? null,
          clock: p.clock?.displayValue ?? null,
          description: p.text ?? null,
          offense_team: p.team?.abbreviation ?? null,
          defense_team: null, // we can improve this later
          down: p.down ?? null,
          distance: p.distance ?? null,
          down_distance_text: p.downDistanceText ?? null,
          scoring_play: p.scoringPlay ?? false,
        }));

        // 3) Upsert into Supabase (nfl_plays)
        const { error: upsertError } = await supabase
          .from("nfl_plays")
          .upsert(rowsToUpsert, {
            onConflict: "game_id,play_id",
          });

        if (upsertError) {
          console.error("Supabase upsert error:", upsertError);
          results.push({ gameId, status: "supabase_error" });
        } else {
          results.push({
            gameId,
            status: "ok",
            inserted: rowsToUpsert.length,
          });
        }
      } catch (err: any) {
        console.error("Error ingesting game", gameId, err);
        results.push({ gameId, status: "exception", message: err?.message });
      }
    }

    return NextResponse.json({ status: "done", results });
  } catch (err: any) {
    console.error("Unexpected ingest error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
