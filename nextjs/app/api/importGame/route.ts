import axios from "axios";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/* --------------------------------------------------------
   Helper: Safe Play-Type Classification (your original logic)
-------------------------------------------------------- */
function classifyPlayType(description: string): string {
  const text = description?.toLowerCase() ?? "";

  if (text.includes("punts")) return "punt";
  if (text.includes("punt")) return "punt";
  if (text.includes("onside kick")) return "kickoff-onside";
  if (text.includes("kicks off") || text.includes("kickoff")) return "kickoff";
  if (text.includes("field goal")) return "field-goal";
  if (text.includes("extra point")) return "extra-point";
  if (text.includes("two-point") || text.includes("two pt"))
    return "two-point-attempt";
  if (text.includes("spikes")) return "qb-spike";
  if (text.includes("kneels")) return "qb-kneel";

  if (text.includes("sacked") || text.includes("sack")) return "pass-sack";
  if (text.includes("scrambles") || text.includes("scramble")) return "qb-scramble";

  if (text.includes("pass")) {
    const depth = text.includes("deep") ? "pass-deep" : "pass-short";

    let direction = "middle";
    if (text.includes("left")) direction = "left";
    else if (text.includes("right")) direction = "right";

    if (text.includes("screen")) return `pass-screen-${direction}`;

    return `${depth}-${direction}`;
  }

  if (text.includes("left end")) return "rush-left-end";
  if (text.includes("left tackle")) return "rush-left-tackle";
  if (text.includes("left guard")) return "rush-left-guard";
  if (text.includes("right end")) return "rush-right-end";
  if (text.includes("right tackle")) return "rush-right-tackle";
  if (text.includes("right guard")) return "rush-right-guard";
  if (text.includes("up the middle") || text.includes("middle"))
    return "rush-middle";

  if (text.includes("right")) return "rush-right";
  if (text.includes("left")) return "rush-left";
  if (text.includes("rush")) return "rush";

  return "other";
}

/* --------------------------------------------------------
   Helper: Drive Success Logic (unchanged)
-------------------------------------------------------- */
function computeSuccess(
  down: number | null,
  distance: number | null,
  yards: number | null
): boolean | null {
  if (!down || !distance || yards === null) return null;

  if (down === 1) return yards >= 0.4 * distance;
  if (down === 2) return yards >= 0.6 * distance;
  if (down === 3 || down === 4) return yards >= distance;

  return null;
}

/* --------------------------------------------------------
   MAIN IMPORT HANDLER (Option A — maximum safety)
-------------------------------------------------------- */

export async function POST(req: Request) {
  try {
    const { gameId } = await req.json();
    if (!gameId) {
      return NextResponse.json({ error: "Missing gameId" }, { status: 400 });
    }

    /* ----------------------------------------------
       1. Fetch Full RapidAPI JSON (lossless)
    ---------------------------------------------- */
    const { origin } = new URL(req.url);
    const playsUrl = new URL("/api/getPlays", origin);
    playsUrl.searchParams.set("gameId", gameId);

    const apiResponse = await axios.get(playsUrl.toString());
    const data = apiResponse.data;

    /* ----------------------------------------------
       2. Validate Competition / Teams
    ---------------------------------------------- */
    const comp = data.competitions?.[0];
    if (!comp) throw new Error("Missing competition data");

    const competitors = comp.competitors ?? [];
    if (competitors.length < 2) throw new Error("Missing competitors");

    const home = competitors.find((c: any) => c.homeAway === "home");
    const away = competitors.find((c: any) => c.homeAway === "away");

    if (!home || !away) throw new Error("Missing home/away teams");

    const homeTeam = home.team;
    const awayTeam = away.team;

    /* ----------------------------------------------
       3. Build ESPN → Team Abbreviation Map (your original logic)
    ---------------------------------------------- */
    const teamAbbrByEspnId: Record<string, string> = {};
    teamAbbrByEspnId[homeTeam.id] = homeTeam.abbreviation;
    teamAbbrByEspnId[awayTeam.id] = awayTeam.abbreviation;

    /* ----------------------------------------------
       4. Insert GAME metadata
    ---------------------------------------------- */
    const season = data.season?.year ?? null;
    const week =
      data.week?.number ??
      data.week ??
      comp.week?.number ??
      null;

    const gameDateIso = comp.date ? new Date(comp.date).toISOString() : null;

    await supabaseAdmin.from("games").upsert({
      id: Number(data.id),
      season,
      week,
      home_team_id: homeTeam.abbreviation,
      away_team_id: awayTeam.abbreviation,
      home_score: Number(home.score ?? 0),
      away_score: Number(away.score ?? 0),
      date: gameDateIso,
    });

    /* ----------------------------------------------
       5. Insert TEAMS metadata
    ---------------------------------------------- */
    await supabaseAdmin.from("teams").upsert(
      [
        {
          id: homeTeam.abbreviation,
          espn_team_id: homeTeam.id,
          name: homeTeam.name,
          display_name: homeTeam.displayName,
          abbreviation: homeTeam.abbreviation,
          location: homeTeam.location,
          logo: homeTeam.logos?.[0]?.href ?? null,
          color: homeTeam.color ?? null,
          alternate_color: homeTeam.alternateColor ?? null,
        },
        {
          id: awayTeam.abbreviation,
          espn_team_id: awayTeam.id,
          name: awayTeam.name,
          display_name: awayTeam.displayName,
          abbreviation: awayTeam.abbreviation,
          location: awayTeam.location,
          logo: awayTeam.logos?.[0]?.href ?? null,
          color: awayTeam.color ?? null,
          alternate_color: awayTeam.alternateColor ?? null,
        },
      ],
      { onConflict: "id" }
    );

    /* ----------------------------------------------
       6. Insert TEAM GAME STATS (boxScore.teams)
    ---------------------------------------------- */
    const box = data.boxScore;
    if (box?.teams) {
      const statsPayload = [];

      for (const t of box.teams) {
        const tid = t.team.abbreviation;

        const map: Record<string, any> = {};
        for (const s of t.statistics ?? []) {
          if (s.name) {
            map[s.name] =
              s.value ??
              s.displayValue ??
              s.displayValueRaw ??
              null;
          }
        }

        statsPayload.push({
          game_id: Number(data.id),
          team_id: tid,
          home_away: tid === homeTeam.abbreviation ? "home" : "away",
          points: tid === homeTeam.abbreviation ? Number(home.score) : Number(away.score),
          first_downs: map.firstDowns ?? null,
          total_yards: map.totalYards ?? null,
          passing_yards: map.passingYards ?? null,
          rushing_yards: map.rushingYards ?? null,
          yards_per_play: map.yardsPerPlay ?? null,
          turnovers: map.turnovers ?? null,
          sacks: map.sacks ?? null,
          time_of_possession: map.timeOfPossession ?? null,
          third_down_eff: map.thirdDownEff ?? null,
          fourth_down_eff: map.fourthDownEff ?? null,
          red_zone_eff: map.redZoneEff ?? null,
        });
      }

      await supabaseAdmin
        .from("team_game_stats")
        .upsert(statsPayload, { onConflict: "game_id,team_id" });
    }

    /* ----------------------------------------------
       7. Insert PLAYERS + PLAYER GAME STATS (as-is)
    ---------------------------------------------- */
    if (box?.players) {
      const players = new Map<string, any>();
      const pgStats = [];

      for (const category of box.players) {
        const categoryName = category.name;
        const teamAbbr = category.team?.abbreviation ?? null;

        for (const statGroup of category.statistics ?? []) {
          const keys = statGroup.keys ?? [];
          const labels = statGroup.labels ?? [];

          for (const athlete of statGroup.athletes ?? []) {
            const a = athlete.athlete;
            if (!a?.id) continue;

            /* ----------------------
               Store Player (as-is)
            ---------------------- */
            players.set(a.id, {
              id: String(a.id),
              name: a.displayName ?? null,
              first_name: a.firstName ?? null,
              last_name: a.lastName ?? null,
              position: a.position?.abbreviation ?? null,
              current_team_id: teamAbbr,
              headshot_url: a.headshot?.href ?? null,
            });

            /* ----------------------
               Store Raw + Parsed Stats
               (parsed = AS-IS except numbers)
            ---------------------- */
            const raw: Record<string, any> = {};
            const parsed: Record<string, any> = {};

            const values = athlete.stats ?? [];
            for (let i = 0; i < values.length; i++) {
              const key = keys[i] ?? `col_${i}`;
              const label = labels[i] ?? key;
              raw[key] = values[i];
              parsed[label] = values[i]; // <-- LOSSLESS MODE
            }

            pgStats.push({
              game_id: Number(data.id),
              team_id: teamAbbr,
              player_id: String(a.id),
              category: categoryName,
              stats_raw: raw,
              stats_parsed: parsed, // <-- EXACT AS-IS
            });
          }
        }
      }

      await supabaseAdmin
        .from("players")
        .upsert([...players.values()], { onConflict: "id" });

      await supabaseAdmin
        .from("player_game_stats")
        .upsert(pgStats, { onConflict: "game_id,player_id,category" });
    }

    /* ----------------------------------------------
       8. Insert PLAY-BY-PLAY → nfl_plays (lossless)
    ---------------------------------------------- */
    const drives = data.drives?.previous ?? [];
    const playRows = [];

    for (const drive of drives) {
      const driveId = drive.id ?? null;
      const driveDesc = drive.description ?? null;
      const driveResult = drive.result ?? drive.shortDisplayResult ?? null;
      const drivePlays = drive.offensivePlays ?? null;
      const driveYards = drive.yards ?? null;
      const driveTime = drive.timeElapsed?.displayValue ?? null;

      for (const play of drive.plays ?? []) {
        const seq =
          play.sequenceNumber !== undefined
            ? Number(play.sequenceNumber)
            : null;

        const pid =
          play.id && !isNaN(Number(play.id))
            ? Number(play.id)
            : seq;

        const period = play.period?.number ?? null;
        const clock = play.clock?.displayValue ?? null;

        const desc = play.text ?? play.description ?? "";

        const start = play.start ?? {};
        const end = play.end ?? {};

        const down = start.down ?? null;
        const distance = start.distance ?? null;
        const yardsToGoal = start.yardsToEndzone ?? null;

        const startYL = start.yardLine ?? null;
        const endYL = end.yardLine ?? null;

        /* Offense ESPN ID */
        const offEspn =
          start.team?.id ??
          play.team?.id ??
          drive.team?.id ??
          null;

        /* Offense Abbreviation (safe mapping) */
        const offense = offEspn ? teamAbbrByEspnId[offEspn] ?? null : null;

        /* Defense Abbreviation */
        let defense: string | null = null;
        if (offense === homeTeam.abbreviation) defense = awayTeam.abbreviation;
        else if (offense === awayTeam.abbreviation) defense = homeTeam.abbreviation;

        /* Play type + success */
        const playType = classifyPlayType(desc);
        const yards =
          play.statYardage !== undefined && play.statYardage !== null
            ? Number(play.statYardage)
            : null;

        const success = computeSuccess(down, distance, yards);

        /* -----------------------------------------
           Insert Row (raw_* and calc_* ONLY)
           enrich_* remains empty for now
        ----------------------------------------- */
        playRows.push({
          game_id: Number(data.id),
          play_id: pid,

          /* RAW */
          raw_quarter: period,
          raw_clock: clock,
          raw_description: desc,
          raw_down: down,
          raw_distance: distance,
          raw_start_yardline: startYL,
          raw_end_yardline: endYL,
          raw_yards_to_goal: yardsToGoal,
          raw_drive_id: driveId,
          raw_drive_description: driveDesc,
          raw_drive_result: driveResult,
          raw_drive_plays: drivePlays,
          raw_drive_yards: driveYards,
          raw_drive_time_elapsed: driveTime,
          raw_offense_team: offense,
          raw_defense_team: defense,
          raw_offense_espn_team_id: offEspn,
          raw_defense_espn_team_id:
            offense === homeTeam.abbreviation ? awayTeam.id : homeTeam.id,
          raw_scoring_play: play.scoringPlay ?? null,
          raw_scoring_type: play.scoringType?.name ?? null,
          raw_home_score_before: play.homeScore ?? null,
          raw_away_score_before: play.awayScore ?? null,
          raw_wallclock: play.wallclock ? new Date(play.wallclock).toISOString() : null,
          raw_modified: play.modified ? new Date(play.modified).toISOString() : null,

          /* COMPUTED */
          calc_sequence_number: seq,
          calc_play_type: playType,
          calc_success: success,
          calc_epa: null,
          calc_pressure_likely: null,
          calc_short_down_distance_text: start.shortDownDistanceText ?? null,
          calc_down_distance_text: start.downDistanceText ?? null,
          calc_start_possession_text: start.possessionText ?? null,
          calc_end_possession_text: end.possessionText ?? null,
          calc_start_yardline_numeric: startYL,
          calc_end_yardline_numeric: endYL,
          calc_season: season,
          calc_week: week,
          calc_game_date: gameDateIso ? gameDateIso.substring(0, 10) : null,
        });
      }
    }

    /* ----------------------------------------------
       9. UPSERT INTO nfl_plays
    ---------------------------------------------- */
    if (playRows.length > 0) {
      await supabaseAdmin
        .from("nfl_plays")
        .upsert(playRows, { onConflict: "game_id,play_id" });
    }

    return NextResponse.json({
      success: true,
      gameId,
      inserted: playRows.length,
    });
  } catch (err: any) {
    console.error("ImportGame Error:", err);
    return NextResponse.json(
      { error: err.message || "Unknown server error" },
      { status: 500 }
    );
  }
}
