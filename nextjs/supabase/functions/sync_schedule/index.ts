// supabase/functions/sync_schedule/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";



// Use 2025 by default, but allow override via NFL_SEASON

const CURRENT_SEASON = parseInt(Deno.env.get("NFL_SEASON") ?? "2025", 10);



const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;



const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);



async function fetchWeekScoreboard(week: number) {

  const url = new URL(

    "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",

  );



  // ESPN scoreboard pattern

  url.searchParams.set("dates", String(CURRENT_SEASON)); // season year

  url.searchParams.set("seasontype", "2");                // regular season

  url.searchParams.set("week", String(week));             // week number



  const res = await fetch(url.toString());

  if (!res.ok) {

    throw new Error(`Failed to fetch scoreboard for week ${week} (status ${res.status})`);

  }



  const data = await res.json();

  return data.events ?? [];

}



serve(async () => {

  try {

    let totalGames = 0;

    const maxWeeks = 18; // regular season weeks

    const nowIso = new Date().toISOString();



    for (let week = 1; week <= maxWeeks; week++) {

      const events = await fetchWeekScoreboard(week);



      for (const evt of events) {

        const gameId: string | undefined = evt.id;

        if (!gameId) continue;



        const competition = evt.competitions?.[0];

        if (!competition) continue;



        const competitors = competition.competitors ?? [];

        const home = competitors.find((c: any) => c.homeAway === "home");

        const away = competitors.find((c: any) => c.homeAway === "away");



        const startDate = competition.date

          ? new Date(competition.date).toISOString()

          : null;



        const statusState = evt.status?.type?.state ?? "pre"; // pre | in | post



        const homeAbbr = home?.team?.abbreviation ?? null;

        const awayAbbr = away?.team?.abbreviation ?? null;

        const homeScore = home?.score ? parseInt(home.score, 10) : null;

        const awayScore = away?.score ? parseInt(away.score, 10) : null;



        // 1) Upsert into game_schedule

        const { error: schedError } = await supabase

          .from("game_schedule")

          .upsert({

            game_id: gameId,

            season: CURRENT_SEASON,

            week,

            home_team: homeAbbr,

            away_team: awayAbbr,

            start_time: startDate,

            status: statusState,

            last_checked: nowIso,

          });



        if (schedError) {

          console.error("game_schedule upsert error", gameId, schedError);

        }



        // 2) Upsert minimal row into games table

        const { error: gameError } = await supabase

          .from("games")

          .upsert({

            id: gameId,

            season: CURRENT_SEASON,

            week,

            home_team_id: homeAbbr,

            away_team_id: awayAbbr,

            home_score: homeScore,

            away_score: awayScore,

            date: startDate,

          });



        if (gameError) {

          console.error("games upsert error", gameId, gameError);

        }



        totalGames++;

      }

    }



    return new Response(

      JSON.stringify({

        status: "ok",

        season: CURRENT_SEASON,

        totalGames,

      }),

      { headers: { "Content-Type": "application/json" } },

    );

  } catch (err) {

    console.error("sync_schedule fatal error:", err);

    return new Response(

      JSON.stringify({ status: "error", error: String(err) }),

      {

        status: 500,

        headers: { "Content-Type": "application/json" },

      },

    );

  }

});
