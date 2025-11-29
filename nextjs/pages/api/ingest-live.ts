// Force rebuild



import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const RAPID_API_KEY = process.env.RAPID_API_KEY;
const RAPID_HOST = "sports-information.p.rapidapi.com";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!RAPID_API_KEY) {
    return res.status(500).json({
      error: "Missing RAPID_API_KEY in environment variables",
    });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 1️⃣ Fetch ESPN scoreboard (free & lightweight)
    const scoreboard = await fetch(
      "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard"
    ).then((res) => res.json());

    const events = scoreboard?.events || [];

    // Live games only
    const liveGames = events.filter((g: any) => {
      const comp = g.competitions?.[0];
      return comp?.status?.type?.state === "in";
    });

    if (liveGames.length === 0) {
      return res.status(200).json({
        message: "No live games at this moment. Nothing ingested.",
      });
    }

    const results: any[] = [];

    // 2️⃣ Loop through each live game
    for (const game of liveGames) {
      const gameId = game.id;

      try {
        // 3️⃣ Fetch PBP from RapidAPI
        const pbpRes = await fetch(
          `https://${RAPID_HOST}/nfl/play-by-play/${gameId}`,
          {
            method: "GET",
            headers: {
              "x-rapidapi-key": RAPID_API_KEY,
              "x-rapidapi-host": RAPID_HOST,
            },
          }
        );

        if (!pbpRes.ok) {
          results.push({
            gameId,
            status: "rapidapi_error",
            code: pbpRes.status,
          });
          continue;
        }

        const pbpJson = await pbpRes.json();

        // Normalize expected shape
        const plays = pbpJson?.allPlays || pbpJson?.plays || [];

        if (!Array.isArray(plays) || plays.length === 0) {
          results.push({ gameId, status: "no_plays_in_response" });
          continue;
        }

        // 4️⃣ Map RapidAPI → Supabase schema
        const rowsToUpsert = plays.map((p: any) => ({
          game_id: Number(gameId),
          play_id: p?.id ?? null,
          sequence_number: p?.sequenceNumber ?? null,
          quarter: p?.period ?? null,
          clock: p?.clock?.displayValue ?? null,
          description: p?.text ?? null,
          offense_team: p?.team?.abbreviation ?? null,
          defense_team: null,
          down: p?.down ?? null,
          distance: p?.distance ?? null,
          down_distance_text: p?.downDistanceText ?? null,
          scoring_play: p?.scoringPlay ?? false,
        }));

        // 5️⃣ UPSERT the plays
        const { error: upsertError } = await supabase
          .from("nfl_plays")
          .upsert(rowsToUpsert, {
            onConflict: "game_id,play_id",
          });

        if (upsertError) {
          results.push({ gameId, status: "supabase_error", upsertError });
        } else {
          results.push({
            gameId,
            status: "ok",
            plays: rowsToUpsert.length,
          });
        }
      } catch (err: any) {
        results.push({
          gameId,
          status: "exception",
          message: err.message,
        });
      }
    }

    return res.status(200).json({ status: "complete", results });
  } catch (err: any) {
    return res.status(500).json({
      error: err.message ?? "Unknown error",
    });
  }
}
