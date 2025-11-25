import axios from "axios";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/* --------------------------------------------
   Utility Helpers
-------------------------------------------- */

function computeSuccess(
  down: number | null,
  distance: number | null,
  yardsGained: number | null
): boolean | null {
  if (!down || !distance || yardsGained == null) return null;

  if (down === 1) return yardsGained >= 0.4 * distance;
  if (down === 2) return yardsGained >= 0.6 * distance;
  if (down === 3 || down === 4) return yardsGained >= distance;

  return null;
}

function classifyPlayType(description: string): string {
  const text = description.toLowerCase();

  // Non-offense plays
  if (text.includes("punts")) return "punt";
  if (text.includes("punt")) return "punt";
  if (text.includes("onside kick")) return "kickoff-onside";
  if (text.includes("kickoff") || text.includes("kicks off")) return "kickoff";
  if (text.includes("field goal")) return "field-goal";
  if (text.includes("extra point")) return "extra-point";
  if (text.includes("two-point") || text.includes("two pt"))
    return "two-point-attempt";
  if (text.includes("spike")) return "qb-spike";
  if (text.includes("kneel")) return "qb-kneel";

  // Penalties
  if (text.startsWith("penalty on") || text.includes("penalty on")) {
    if (text.includes("offensive") || text.includes("offense"))
      return "penalty-offense";
    if (text.includes("defensive") || text.includes("defense"))
      return "penalty-defense";
    return "penalty";
  }

  // Sacks / scrambles
  if (text.includes("sacked") || text.includes("sack")) return "pass-sack";
  if (text.includes("scramble")) return "qb-scramble";

  // Pass plays
  if (text.includes("pass")) {
    const depth = text.includes("deep") ? "deep" : "short";
    let direction = "middle";
    if (text.includes("left")) direction = "left";
    else if (text.includes("right")) direction = "right";

    if (text.includes("screen")) return `pass-screen-${direction}`;

    return `pass-${depth}-${direction}`;
  }

  // Rush plays
  if (text.includes("left end")) return "rush-left-end";
  if (text.includes("left tackle")) return "rush-left-tackle";
  if (text.includes("left guard")) return "rush-left-guard";
  if (text.includes("right end")) return "rush-right-end";
  if (text.includes("right tackle")) return "rush-right-tackle";
  if (text.includes("right guard")) return "rush-right-guard";
  if (text.includes("middle") || text.includes("up the middle"))
    return "rush-middle";

  if (text.includes("right")) return "rush-right";
  if (text.includes("left")) return "rush-left";
  if (text.includes("rush")) return "rush";

  return "other";
}

/* --------------------------------------------
   Main Handler
-------------------------------------------- */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { gameId } = body;

    if (!gameId) {
      return NextResponse.json({ error: "Missing gameId" }, { status: 400 });
    }

    /* -----------------------------
       Fetch PBP JSON
    ------------------------------ */
    const { origin } = new URL(request.url);
    const playsUrl = new URL("/api/getPlays", origin);
    playsUrl.searchParams.set("gameId", gameId);

    const apiResponse = await axios.get(playsUrl.toString());
    const gameData = apiResponse.data;

    /* -----------------------------
       Extract Teams + Game Info
    ------------------------------ */
    const competition = gameData.competitions?.[0];
    if (!competition) {
      return NextResponse.json(
        { error: "Invalid game data: missing competition" },
        { status: 400 }
      );
    }

    const competitors = competition.competitors || [];
    const homeCompetitor = competitors.find((c: any) => c.homeAway === "home");
    const awayCompetitor = competitors.find((c: any) => c.homeAway === "away");

    const homeTeam = homeCompetitor.team;
    const awayTeam = awayCompetitor.team;

    const homeScore = Number(homeCompetitor.score ?? 0);
    const awayScore = Number(awayCompetitor.score ?? 0);

    const seasonYear = gameData.season?.year ?? null;
    const weekNumber =
      gameData.week?.number ??
      gameData.week ??
      gameData.competitions?.[0]?.week?.number ??
      null;
    const gameDateIso = competition.date
      ? new Date(competition.date).toISOString()
      : null;

    /* -----------------------------
       UPSERT GAME
    ------------------------------ */
    await supabaseAdmin.from("games").upsert({
      id: gameData.id,
      season: seasonYear,
      week: weekNumber,
      home_team_id: homeTeam.abbreviation,
      away_team_id: awayTeam.abbreviation,
      home_score: homeScore,
      away_score: awayScore,
      date: gameDateIso,
    });

    /* -----------------------------
       Map ESPN Numeric IDs → Abbr
    ------------------------------ */
    const teamAbbrByEspnId: Record<string, string> = {};
    teamAbbrByEspnId[homeTeam.id] = homeTeam.abbreviation;
    teamAbbrByEspnId[awayTeam.id] = awayTeam.abbreviation;

    /* -----------------------------
       UPSERT TEAMS
    ------------------------------ */
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

    /* -----------------------------
       TEAM GAME STATS
    ------------------------------ */
    const boxScore = gameData.boxScore;
    if (boxScore?.teams) {
      const teamStatsToUpsert = [];

      for (const t of boxScore.teams) {
        const statsMap: Record<string, any> = {};
        for (const s of t.statistics ?? []) {
          if (s.name) statsMap[s.name] = s.value ?? s.displayValue ?? null;
        }

        teamStatsToUpsert.push({
          game_id: gameData.id,
          team_id: t.team.abbreviation,
          home_away:
            t.team.abbreviation === homeTeam.abbreviation ? "home" : "away",
          points:
            t.team.abbreviation === homeTeam.abbreviation
              ? homeScore
              : awayScore,
          first_downs: statsMap.firstDowns ?? null,
          total_yards: statsMap.totalYards ?? null,
          passing_yards: statsMap.passingYards ?? null,
          rushing_yards: statsMap.rushingYards ?? null,
          turnovers: statsMap.turnovers ?? null,
          sacks: statsMap.sacks ?? null,
          time_of_possession: statsMap.timeOfPossession ?? null,
        });
      }

      await supabaseAdmin
        .from("team_game_stats")
        .upsert(teamStatsToUpsert, { onConflict: "game_id,team_id" });
    }

    /* -----------------------------
       PLAYER & PLAYER-GAME STATS
    ------------------------------ */
    if (boxScore?.players) {
      const players: any[] = [];
      const playerStats: any[] = [];

      for (const category of boxScore.players) {
        const categoryName = category.name;
        const categoryTeam = category.team?.abbreviation ?? null;

        for (const statsGroup of category.statistics ?? []) {
          const keys = statsGroup.keys || [];
          const labels = statsGroup.labels || [];

          for (const athlete of statsGroup.athletes ?? []) {
            const p = athlete.athlete;
            if (!p?.id) continue;

            players.push({
              id: String(p.id),
              name: p.displayName ?? null,
              first_name: p.firstName ?? null,
              last_name: p.lastName ?? null,
              position: p.position?.abbreviation ?? null,
              current_team_id: categoryTeam,
              headshot_url: p.headshot?.href ?? null,
            });

            const rawStats: any = {};
            const parsedStats: any = {};

            const values = athlete.stats || [];
            for (let i = 0; i < values.length; i++) {
              const key = keys[i] ?? `col_${i}`;
              const label = labels[i] ?? key;
              const value = values[i];

              rawStats[key] = value;

              if (
                typeof value === "number" ||
                (typeof value === "string" &&
                  value.trim() !== "" &&
                  !isNaN(Number(value)) &&
                  !value.includes("/") &&
                  !value.includes("-"))
              ) {
                parsedStats[label] = Number(value);
              } else {
                parsedStats[label] = value;
              }
            }

            playerStats.push({
              game_id: gameData.id,
              team_id: categoryTeam,
              player_id: String(p.id),
              category: categoryName,
              stats_raw: rawStats,
              stats_parsed: parsedStats,
            });
          }
        }
      }

      await supabaseAdmin
        .from("players")
        .upsert(
          Array.from(new Map(players.map((p) => [p.id, p])).values()),
          { onConflict: "id" }
        );

      await supabaseAdmin
        .from("player_game_stats")
        .upsert(playerStats, { onConflict: "game_id,player_id,category" });
    }

    /* -----------------------------
       ADVANCED PLAY-BY-PLAY
    ------------------------------ */
    const drives = gameData.drives?.previous ?? [];
    const nflPlays: any[] = [];
    const legacyPlays: any[] = [];

    for (const drive of drives) {
      const driveId = drive.id ?? null;
      const driveDescription = drive.description ?? null;
      const driveResult =
        drive.result ?? drive.shortDisplayResult ?? null;
      const driveYards = drive.yards ?? null;
      const drivePlays = drive.offensivePlays ?? null;
      const driveTimeElapsed = drive.timeElapsed?.displayValue ?? null;

      const plays = drive.plays ?? [];

      for (const play of plays) {
        const seq = play.sequenceNumber ? Number(play.sequenceNumber) : null;

        let numericPlayId: number | null = null;
        if (play.id && !isNaN(Number(play.id))) numericPlayId = Number(play.id);
        else if (seq !== null) numericPlayId = seq;

        const period = play.period?.number ?? null;
        const clock = play.clock?.displayValue ?? null;

        const homeScorePlay = play.homeScore ?? null;
        const awayScorePlay = play.awayScore ?? null;

        const scoringPlay = play.scoringPlay ?? null;
        const scoringType = play.scoringType?.name ?? null;

        const start = play.start ?? {};
        const end = play.end ?? {};

        const down = start.down ?? null;
        const distance = start.distance ?? null;

        const shortText = start.shortDownDistanceText ?? null;
        const downDistanceText = start.downDistanceText ?? null;
        const possessionStart = start.possessionText ?? null;
        const possessionEnd = end.possessionText ?? null;

        const startYL = start.yardLine ?? null;
        const endYL = end.yardLine ?? null;

        const yardsToGoal = start.yardsToEndzone ?? null;

        const offenseEspnId =
          start.team?.id || play.team?.id || drive.team?.id || null;

        const offenseAbbr = offenseEspnId
          ? teamAbbrByEspnId[offenseEspnId] ?? null
          : null;

        let defenseAbbr: string | null = null;
        if (offenseAbbr === homeTeam.abbreviation)
          defenseAbbr = awayTeam.abbreviation;
        else if (offenseAbbr === awayTeam.abbreviation)
          defenseAbbr = homeTeam.abbreviation;

        const description = play.text ?? play.description ?? "";
        const playType = classifyPlayType(description);

        const rawYards =
          play.statYardage !== undefined && play.statYardage !== null
            ? Number(play.statYardage)
            : null;

        const success = computeSuccess(down, distance, rawYards);

        /* legacy "plays" table */
        legacyPlays.push({
          id: play.id || `${gameData.id}-${seq}`,
          game_id: gameData.id,
          team_id: offenseAbbr,
          defense_team_id: defenseAbbr,
          sequence: seq,
          quarter: period,
          clock: clock,
          down: down,
          distance: distance,
          yards_to_goal: yardsToGoal,
          yard_line: startYL,
          play_type: playType,
          yards_gained: rawYards,
          success: success,
          description: description,
          raw: play,
        });

        /* new master nfl_plays table */
        nflPlays.push({
          game_id: Number(gameData.id),
          play_id: numericPlayId,

          sequence_number: seq,
          quarter: period,
          qtr: period,
          clock: clock,
          wallclock: play.wallclock
            ? new Date(play.wallclock).toISOString()
            : null,
          modified: play.modified
            ? new Date(play.modified).toISOString()
            : null,

          home_score_before_play: homeScorePlay,
          away_score_before_play: awayScorePlay,
          scoring_play: scoringPlay,
          scoring_type: scoringType,

          drive_id: driveId,
          drive_description: driveDescription,
          drive_result: driveResult,
          drive_yards: driveYards,
          drive_plays: drivePlays,
          drive_time_elapsed: driveTimeElapsed,

          short_down_distance_text: shortText,
          down_distance_text: downDistanceText,
          start_possession_text: possessionStart,
          end_possession_text: possessionEnd,

          start_yardline: startYL,
          end_yardline: endYL,
          yards_to_endzone: yardsToGoal,

          offense_team: offenseAbbr,
          defense_team: defenseAbbr,
          offense_espn_team_id: offenseEspnId,
          defense_espn_team_id:
            offenseAbbr === homeTeam.abbreviation
              ? awayTeam.id
              : homeTeam.id,

          down: down,
          distance: distance,
          yard_line: startYL ? String(startYL) : null,

          description: description,
          play_type: playType,
          result_type: playType,
          result_yards: rawYards,
          success: success,

          week: weekNumber,
          season: seasonYear,
          game_date: gameDateIso ? gameDateIso.substring(0, 10) : null,
        });
      }
    }

    /* write output to DB */

    if (legacyPlays.length > 0) {
      await supabaseAdmin
        .from("plays")
        .upsert(legacyPlays, { onConflict: "id" });
    }

    if (nflPlays.length > 0) {
      await supabaseAdmin
        .from("nfl_plays")
        .upsert(nflPlays, { onConflict: "game_id,play_id" });
    }

    return NextResponse.json({
      success: true,
      gameId,
      inserted: {
        nflPlays: nflPlays.length,
        legacyPlays: legacyPlays.length,
      },
    });
  } catch (error: any) {
    console.error("Import Game Error:", error);
    return NextResponse.json(
      { error: error.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
