import axios from "axios";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// ----------------- Helpers -----------------

function computeSuccess(
  down: number | null,
  distance: number | null,
  yardsGained: number | null
): boolean | null {
  if (!down || !distance || yardsGained === null || yardsGained === undefined) {
    return null;
  }

  if (down === 1) {
    return yardsGained >= 0.4 * distance;
  }
  if (down === 2) {
    return yardsGained >= 0.6 * distance;
  }
  if (down === 3 || down === 4) {
    return yardsGained >= distance;
  }

  return null;
}

function classifyPlayType(description: string): string {
  const text = description.toLowerCase();

  // Obvious non-offense plays
  if (text.includes("punts")) return "punt";
  if (text.includes("punt")) return "punt";
  if (text.includes("onside kick")) return "kickoff-onside";
  if (text.includes("kicks off") || text.includes("kickoff")) return "kickoff";
  if (text.includes("field goal")) return "field-goal";
  if (text.includes("extra point")) return "extra-point";
  if (text.includes("two-point") || text.includes("two pt"))
    return "two-point-attempt";
  if (text.includes("spikes the ball") || text.includes("spike"))
    return "qb-spike";
  if (text.includes("kneels") || text.includes("kneel")) return "qb-kneel";

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
  if (text.includes("scrambles") || text.includes("scramble"))
    return "qb-scramble";

  // Pass plays
  if (text.includes("pass")) {
    const depth = text.includes("deep") ? "deep" : "short";

    let direction = "middle";
    if (text.includes("left")) direction = "left";
    else if (text.includes("right")) direction = "right";

    if (text.includes("screen")) return `pass-screen-${direction}`;

    return `pass-${depth}-${direction}`; // e.g. pass-short-left
  }

  // Rush plays (gap / direction based on ESPN wording)
  if (text.includes("left end")) return "rush-left-end";
  if (text.includes("left tackle")) return "rush-left-tackle";
  if (text.includes("left guard")) return "rush-left-guard";
  if (text.includes("right end")) return "rush-right-end";
  if (text.includes("right tackle")) return "rush-right-tackle";
  if (text.includes("right guard")) return "rush-right-guard";
  if (text.includes("up the middle") || text.includes("middle"))
    return "rush-middle";

  // FIXED rush direction classification
  if (text.includes("right")) return "rush-right";
  if (text.includes("left")) return "rush-left";
  if (text.includes("rush") || text.includes("left") || text.includes("right"))
    return "rush";

  // Fallback
  return "other";
}

function parseSlashPair(
  value: any
): { first: number | null; second: number | null } {
  if (typeof value !== "string") return { first: null, second: null };
  const [a, b] = value.split("/");
  const first = a !== undefined && a !== "" ? Number(a) : null;
  const second = b !== undefined && b !== "" ? Number(b) : null;
  return {
    first: Number.isFinite(first as number) ? (first as number) : null,
    second: Number.isFinite(second as number) ? (second as number) : null,
  };
}

function parseDashPair(
  value: any
): { first: number | null; second: number | null } {
  if (typeof value !== "string") return { first: null, second: null };
  const [a, b] = value.split("-");
  const first = a !== undefined && a !== "" ? Number(a) : null;
  const second = b !== undefined && b !== "" ? Number(b) : null;
  return {
    first: Number.isFinite(first as number) ? (first as number) : null,
    second: Number.isFinite(second as number) ? (second as number) : null,
  };
}

function toNum(value: any): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// ----------------- Main handler -----------------

export async function POST(request: Request) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Missing Supabase admin credentials" },
      { status: 500 }
    );
  }
  try {
    const body = await request.json();
    const { gameId } = body;

    if (!gameId) {
      return NextResponse.json({ error: "Missing gameId" }, { status: 400 });
    }

    // 1) Call internal API to get full game JSON
    const { origin } = new URL(request.url);
    const playsUrl = new URL("/api/getPlays", origin);
    playsUrl.searchParams.set("gameId", gameId);

    const apiResponse = await axios.get(playsUrl.toString());
    const gameData = apiResponse.data;

    const numericGameId = Number(gameData.id);

    let teamsInserted = 0;
    let playersInserted = 0;
    let teamStatsInserted = 0;
    let playerStatsInserted = 0;
    let nflPlaysInserted = 0;
    let scoringPlaysInserted = 0;

    // -----------------------------
    // GAME-LEVEL DATA
    // -----------------------------
    const competition = gameData.competitions?.[0];
    if (!competition) {
      return NextResponse.json(
        { error: "Invalid game data: missing competition" },
        { status: 400 }
      );
    }

    const competitors = competition.competitors || [];
    if (competitors.length < 2) {
      return NextResponse.json(
        { error: "Invalid game data: missing competitors" },
        { status: 400 }
      );
    }

    const homeCompetitor = competitors.find(
      (c: any) => c.homeAway === "home"
    );
    const awayCompetitor = competitors.find(
      (c: any) => c.homeAway === "away"
    );

    if (!homeCompetitor || !awayCompetitor) {
      return NextResponse.json(
        { error: "Invalid game data: missing home/away designation" },
        { status: 400 }
      );
    }

    const homeTeam = homeCompetitor.team;
    const awayTeam = awayCompetitor.team;
    const homeScore = parseInt(homeCompetitor.score || "0", 10);
    const awayScore = parseInt(awayCompetitor.score || "0", 10);

    const weekNumber =
      gameData.week?.number ||
      gameData.week ||
      gameData.competitions?.[0]?.week?.number ||
      null;

    // Weather
    const weather = competition.weather || {};
    // Standings
    const standings = gameData.standings || {};

    const { error: gameError } = await supabaseAdmin.from("games").upsert({
      id: numericGameId,
      season: gameData.season?.year ?? null,
      week: weekNumber,
      home_team_id: homeTeam.abbreviation,
      away_team_id: awayTeam.abbreviation,
      home_score: homeScore,
      away_score: awayScore,
      date: competition.date ? new Date(competition.date).toISOString() : null,
      // New season + weather + standings fields
      season_current: gameData.season?.current ?? null,
      season_type: gameData.season?.type ?? null,
      weather_display: weather.displayValue ?? null,
      weather_temperature: weather.temperature ?? null,
      weather_high_temperature: weather.highTemperature ?? null,
      weather_low_temperature: weather.lowTemperature ?? null,
      weather_precipitation: weather.precipitation ?? null,
      standings_header: standings.header ?? null,
      standings_fullview_link: standings.fullViewLink ?? null,
      standings_is_same_conference: standings.isSameConference ?? null,
      standings_groups: standings.groups ?? null,
    });

    if (gameError) {
      throw new Error(`Failed to insert game: ${gameError.message}`);
    }

    // Map ESPN numeric team IDs -> abbreviations (e.g. "27" -> "TB")
    const teamAbbrByEspnId: Record<string, string> = {};
    teamAbbrByEspnId[homeTeam.id] = homeTeam.abbreviation;
    teamAbbrByEspnId[awayTeam.id] = awayTeam.abbreviation;

    // -----------------------------
    // TEAM META (teams table)
    // -----------------------------
    const teamsToUpsert = [
      {
        id: homeTeam.abbreviation,
        espn_team_id: homeTeam.id,
        name: homeTeam.name,
        display_name: homeTeam.displayName,
        abbreviation: homeTeam.abbreviation,
        location: homeTeam.location,
        logo: homeTeam.logos?.[0]?.href || null,
        color: homeTeam.color || null,
        alternate_color: homeTeam.alternateColor || null,
      },
      {
        id: awayTeam.abbreviation,
        espn_team_id: awayTeam.id,
        name: awayTeam.name,
        display_name: awayTeam.displayName,
        abbreviation: awayTeam.abbreviation,
        location: awayTeam.location,
        logo: awayTeam.logos?.[0]?.href || null,
        color: awayTeam.color || null,
        alternate_color: awayTeam.alternateColor || null,
      },
    ];

    const { error: teamsError } = await supabaseAdmin
      .from("teams")
      .upsert(teamsToUpsert, { onConflict: "id" });

    if (teamsError) {
      throw new Error(`Failed to upsert teams: ${teamsError.message}`);
    }
    teamsInserted = teamsToUpsert.length;

    // -----------------------------
    // TEAM-GAME STATS (boxScore.teams)
    // -----------------------------
    const boxScore = gameData.boxScore;
    if (boxScore?.teams) {
      const teamStatsToUpsert: any[] = [];

      for (const teamStat of boxScore.teams) {
        const teamInfo = teamStat.team;
        const teamId = teamInfo?.abbreviation;
        if (!teamId) continue;

        const stats = teamStat.statistics || [];
        const statsMap: Record<string, any> = {};

        for (const stat of stats) {
          const name = stat.name;
          const value =
            stat.value ??
            stat.displayValue ??
            stat.displayValueRaw ??
            null;
          if (name) {
            statsMap[name] = value;
          }
        }

        const totalYardsRaw =
          statsMap.totalYards ??
          statsMap.totalYds ??
          statsMap.netYards ??
          statsMap.netTotalYards ??
          null;
        const passingYardsRaw =
          statsMap.passingYards ??
          statsMap.netPassingYards ??
          statsMap.netPassYards ??
          null;
        const rushingYardsRaw =
          statsMap.rushingYards ?? statsMap.rushYards ?? null;
        const firstDownsRaw = statsMap.firstDowns ?? null;
        const turnoversRaw = statsMap.turnovers ?? statsMap.giveaways ?? null;
        const sacksRaw = statsMap.sacks ?? null;
        const timeOfPossessionRaw =
          statsMap.timeOfPossession ?? statsMap.possessionTime ?? null;
        const thirdDownEffRaw =
          statsMap.thirdDownEff ?? statsMap.thirdDownEfficiency ?? null;
        const fourthDownEffRaw =
          statsMap.fourthDownEff ?? statsMap.fourthDownEfficiency ?? null;
        const redZoneEffRaw =
          statsMap.redZoneEff ?? statsMap.redZoneEfficiency ?? null;
        const yardsPerPlayRaw =
          statsMap.yardsPerPlay ?? statsMap.yardsPerPlayOffense ?? null;

        const teamGameStat = {
          game_id: numericGameId,
          team_id: teamId,
          home_away: teamId === homeTeam.abbreviation ? "home" : "away",
          points: teamId === homeTeam.abbreviation ? homeScore : awayScore,
          first_downs: firstDownsRaw
            ? parseInt(String(firstDownsRaw), 10)
            : null,
          total_yards: totalYardsRaw
            ? parseInt(String(totalYardsRaw), 10)
            : null,
          passing_yards: passingYardsRaw
            ? parseInt(String(passingYardsRaw), 10)
            : null,
          rushing_yards: rushingYardsRaw
            ? parseInt(String(rushingYardsRaw), 10)
            : null,
          yards_per_play: yardsPerPlayRaw
            ? parseFloat(String(yardsPerPlayRaw))
            : null,
          third_down_eff: thirdDownEffRaw ? String(thirdDownEffRaw) : null,
          third_down_pct: null,
          fourth_down_eff: fourthDownEffRaw ? String(fourthDownEffRaw) : null,
          red_zone_eff: redZoneEffRaw ? String(redZoneEffRaw) : null,
          turnovers: turnoversRaw
            ? parseInt(String(turnoversRaw), 10)
            : null,
          sacks: sacksRaw ? parseInt(String(sacksRaw), 10) : null,
          time_of_possession: timeOfPossessionRaw
            ? String(timeOfPossessionRaw)
            : null,
        };

        teamStatsToUpsert.push(teamGameStat);
      }

      if (teamStatsToUpsert.length > 0) {
        const { error: teamStatsError } = await supabaseAdmin
          .from("team_game_stats")
          .upsert(teamStatsToUpsert, {
            onConflict: "game_id,team_id",
          });

        if (teamStatsError) {
          throw new Error(
            `Failed to insert team stats: ${teamStatsError.message}`
          );
        }
        teamStatsInserted = teamStatsToUpsert.length;
      }
    }

    // -----------------------------
    // PLAYER & PLAYER-GAME STATS
    // (one row per player per game per category)
    // -----------------------------
    const playersArr = boxScore?.players || [];

    const playersToUpsert: any[] = [];
    const playerStatsRows: any[] = [];

    if (playersArr.length > 0) {
      // Remove existing stats for this game so we don't duplicate
      await supabaseAdmin
        .from("player_game_stats")
        .delete()
        .eq("game_id", numericGameId);

      for (const teamEntry of playersArr) {
        const teamAbbr = teamEntry.team?.abbreviation || null;
        const statsGroups = teamEntry.statistics || [];

        for (const group of statsGroups) {
          const category = group.name || "unknown";
          const keys: string[] = group.keys || [];
          const labels: string[] = group.labels || [];
          const athletes = group.athletes || [];

          for (const athleteEntry of athletes) {
            const athlete = athleteEntry.athlete;
            if (!athlete?.id) continue;

            const playerId = String(athlete.id);
            const playerTeamAbbr =
              teamAbbr || athlete.team?.abbreviation || null;
            const statValues: any[] = athleteEntry.stats || [];

            // Player meta row
            const playerData = {
              id: playerId,
              name:
                athlete.displayName ||
                athlete.fullName ||
                athlete.name ||
                null,
              first_name: athlete.firstName || null,
              last_name: athlete.lastName || null,
              position: athlete.position?.abbreviation || null,
              current_team_id: playerTeamAbbr,
              headshot_url: athlete.headshot?.href || null,
            };
            playersToUpsert.push(playerData);

            // Build raw map + numeric columns based on category
            const map: Record<string, any> = {};
            for (let i = 0; i < keys.length; i++) {
              const k = keys[i];
              map[k] = statValues[i];
            }

            // Base player stats row
            const statsRow: any = {
              game_id: numericGameId,
              team_id: playerTeamAbbr,
              player_id: playerId,
              category,
              stats_raw: {
                keys,
                labels,
                values: statValues,
                map,
              },
              // initialize all numeric columns to null
              pass_cmp: null,
              pass_att: null,
              pass_yards: null,
              pass_td: null,
              pass_int: null,
              pass_sacks: null,
              pass_sack_yards: null,
              pass_avg: null,
              pass_qbr: null,
              pass_rtg: null,
              rush_att: null,
              rush_yards: null,
              rush_td: null,
              rush_avg: null,
              rush_long: null,
              rec_rec: null,
              rec_tgt: null,
              rec_yards: null,
              rec_td: null,
              rec_avg: null,
              rec_long: null,
              rec_yac: null,
              rec_air_yards: null,
              def_tot: null,
              def_solo: null,
              def_ast: null,
              def_sacks: null,
              def_tfl: null,
              def_pd: null,
              def_qb_hits: null,
              kr_no: null,
              kr_yds: null,
              kr_avg: null,
              kr_long: null,
              kr_td: null,
              pr_no: null,
              pr_yds: null,
              pr_avg: null,
              pr_long: null,
              pr_td: null,
              kick_fg_made: null,
              kick_fg_att: null,
              kick_fg_pct: null,
              kick_fg_long: null,
              kick_xp_made: null,
              kick_xp_att: null,
              kick_points: null,
              punt_no: null,
              punt_yds: null,
              punt_avg: null,
              punt_long: null,
              punt_in20: null,
              punt_tb: null,
            };

            // Fill per-category numeric fields
            switch (category.toLowerCase()) {
              case "passing": {
                statsRow.pass_yards = toNum(map["passingYards"]);
                statsRow.pass_td = toNum(map["passingTouchdowns"]);
                statsRow.pass_int = toNum(map["interceptions"]);
                statsRow.pass_avg = toNum(map["yardsPerPassAttempt"]);

                if (map["QBRating"] !== undefined) {
                  statsRow.pass_rtg = toNum(map["QBRating"]);
                }
                if (map["adjQBR"] !== undefined) {
                  statsRow.pass_qbr = toNum(map["adjQBR"]);
                }

                if (map["completions/passingAttempts"]) {
                  const { first, second } = parseSlashPair(
                    map["completions/passingAttempts"]
                  );
                  statsRow.pass_cmp = first;
                  statsRow.pass_att = second;
                }

                if (map["sacks-sackYardsLost"]) {
                  const { first, second } = parseDashPair(
                    map["sacks-sackYardsLost"]
                  );
                  statsRow.pass_sacks = first;
                  statsRow.pass_sack_yards = second;
                }

                break;
              }
              case "rushing": {
                statsRow.rush_att = toNum(map["rushingAttempts"]);
                statsRow.rush_yards = toNum(map["rushingYards"]);
                statsRow.rush_td = toNum(map["rushingTouchdowns"]);
                statsRow.rush_avg = toNum(map["yardsPerRushAttempt"]);
                statsRow.rush_long = toNum(map["longRushing"]);
                break;
              }
              case "receiving": {
                statsRow.rec_rec = toNum(map["receptions"]);
                statsRow.rec_tgt = toNum(map["receivingTargets"]);
                statsRow.rec_yards = toNum(map["receivingYards"]);
                statsRow.rec_td = toNum(map["receivingTouchdowns"]);
                statsRow.rec_avg = toNum(map["yardsPerReception"]);
                statsRow.rec_long = toNum(map["longReception"]);
                statsRow.rec_yac = toNum(map["yardsAfterCatch"]);
                statsRow.rec_air_yards = toNum(map["airYards"]);
                break;
              }
              case "fumbles": {
                // We leave these in stats_raw for now; can be mapped later.
                break;
              }
              case "defense": {
                statsRow.def_tot = toNum(map["totalTackles"]);
                statsRow.def_solo = toNum(map["soloTackles"]);
                statsRow.def_ast = toNum(map["assistedTackles"]);
                statsRow.def_sacks = toNum(map["sacks"]);
                statsRow.def_tfl = toNum(map["tacklesForLoss"]);
                statsRow.def_pd = toNum(map["passesDefensed"]);
                statsRow.def_qb_hits = toNum(map["qbHits"]);
                break;
              }
              case "kickreturns":
              case "kick returns": {
                statsRow.kr_no = toNum(map["totalKickoffReturns"]);
                statsRow.kr_yds = toNum(map["kickoffReturnYards"]);
                statsRow.kr_avg = toNum(map["avgKickoffReturnYards"]);
                statsRow.kr_long = toNum(map["longKickoffReturn"]);
                statsRow.kr_td = toNum(map["kickoffReturnTouchdowns"]);
                break;
              }
              case "puntreturns":
              case "punt returns": {
                statsRow.pr_no = toNum(map["totalPuntReturns"]);
                statsRow.pr_yds = toNum(map["puntReturnYards"]);
                statsRow.pr_avg = toNum(map["avgPuntReturnYards"]);
                statsRow.pr_long = toNum(map["longPuntReturn"]);
                statsRow.pr_td = toNum(map["puntReturnTouchdowns"]);
                break;
              }
              case "kicking": {
                if (map["fieldGoalsMade/fieldGoalAttempts"]) {
                  const { first, second } = parseSlashPair(
                    map["fieldGoalsMade/fieldGoalAttempts"]
                  );
                  statsRow.kick_fg_made = first;
                  statsRow.kick_fg_att = second;
                }
                if (map["extraPointsMade/extraPointAttempts"]) {
                  const { first, second } = parseSlashPair(
                    map["extraPointsMade/extraPointAttempts"]
                  );
                  statsRow.kick_xp_made = first;
                  statsRow.kick_xp_att = second;
                }
                statsRow.kick_fg_pct = toNum(map["fieldGoalPct"]);
                statsRow.kick_fg_long = toNum(map["longFieldGoalMade"]);
                statsRow.kick_points = toNum(map["totalKickingPoints"]);
                break;
              }
              case "punting": {
                statsRow.punt_no = toNum(map["punts"]);
                statsRow.punt_yds = toNum(map["puntYards"]);
                statsRow.punt_avg = toNum(map["grossAvgPuntYards"]);
                statsRow.punt_long = toNum(map["longPunt"]);
                statsRow.punt_in20 = toNum(map["puntsInside20"]);
                statsRow.punt_tb = toNum(map["touchbacks"]);
                break;
              }
              default:
                // keep only stats_raw for unknown category
                break;
            }

            playerStatsRows.push(statsRow);
          }
        }
      }

      // Deduplicate players
      const uniquePlayers = Array.from(
        new Map(playersToUpsert.map((p) => [p.id, p])).values()
      );

      if (uniquePlayers.length > 0) {
        const { error: playersError } = await supabaseAdmin
          .from("players")
          .upsert(uniquePlayers, { onConflict: "id" });

        if (playersError) {
          throw new Error(`Failed to upsert players: ${playersError.message}`);
        }
        playersInserted = uniquePlayers.length;
      }

      if (playerStatsRows.length > 0) {
        const { error: playerStatsError } = await supabaseAdmin
          .from("player_game_stats")
          .upsert(playerStatsRows, {
            onConflict: "game_id,player_id,category",
          });

        if (playerStatsError) {
          throw new Error(
            `Failed to insert player stats: ${playerStatsError.message}`
          );
        }
        playerStatsInserted = playerStatsRows.length;
      }
    }

    // -----------------------------
    // PLAY-BY-PLAY → nfl_plays
    // -----------------------------
    const drives = gameData.drives?.previous || [];
    const nflPlaysToUpsert: any[] = [];

    // Clear existing plays for this game in nfl_plays to avoid duplicates
    await supabaseAdmin.from("nfl_plays").delete().eq("game_id", numericGameId);

    for (const drive of drives) {
      const plays = drive.plays || [];
      const driveId = drive.id || null;

      const driveTimeElapsed =
        drive.timeElapsed?.displayValue ?? drive.timeElapsed ?? null;
      const driveResult =
        drive.result ??
        drive.shortDisplayResult ??
        drive.displayResult ??
        null;

      for (const play of plays) {
        const playNumericId =
          play.id !== undefined && play.id !== null
            ? Number(play.id)
            : null;

        const period = play.period?.number ?? null;
        const clock = play.clock?.displayValue ?? null;

        const start = play.start || {};
        const end = play.end || {};

        const down = start.down ?? null;
        const distance = start.distance ?? null;
        const yardsToGoal = start.yardsToEndzone ?? null;
        const endYardsToGoal = end.yardsToEndzone ?? null;
        const yardLine = start.yardLine ?? null;
        const endYardLine = end.yardLine ?? null;

        const offenseEspnId =
          start.team?.id || play.team?.id || drive.team?.id || null;
        const offenseAbbr = offenseEspnId
          ? teamAbbrByEspnId[offenseEspnId] || null
          : null;

        let defenseAbbr: string | null = null;
        if (offenseAbbr === homeTeam.abbreviation)
          defenseAbbr = awayTeam.abbreviation;
        else if (offenseAbbr === awayTeam.abbreviation)
          defenseAbbr = homeTeam.abbreviation;

        const description: string = play.text || play.description || "";
        const shortText: string = play.shortText || "";
        const playType = classifyPlayType(description);

        const rawYards =
          play.statYardage !== undefined && play.statYardage !== null
            ? Number(play.statYardage)
            : null;

        const success = computeSuccess(
          down ?? null,
          distance ?? null,
          rawYards
        );

        const seq = play.sequenceNumber
          ? parseInt(play.sequenceNumber, 10)
          : null;

        const homeScoreBefore =
          play.homeScore !== undefined ? Number(play.homeScore) : null;
        const awayScoreBefore =
          play.awayScore !== undefined ? Number(play.awayScore) : null;

        const startYardlineNum =
          yardsToGoal !== undefined && yardsToGoal !== null
            ? Number(yardsToGoal)
            : null;
        const endYardlineNum =
          endYardsToGoal !== undefined && endYardsToGoal !== null
            ? Number(endYardsToGoal)
            : null;

        const nflPlayRow: any = {
          game_id: numericGameId,
          play_id: playNumericId,
          quarter: period,
          clock,
          offense_team: offenseAbbr,
          defense_team: defenseAbbr,
          down,
          distance,
          yard_line: yardLine ?? null,
          description,
          result_yards: rawYards,
          success,
          // New enriched fields
          sequence_number: seq,
          wallclock: play.wallclock
            ? new Date(play.wallclock).toISOString()
            : null,
          modified: play.modified
            ? new Date(play.modified).toISOString()
            : null,
          home_score_before_play: homeScoreBefore,
          away_score_before_play: awayScoreBefore,
          scoring_play: play.scoringPlay ?? null,
          scoring_type:
            play.scoringType?.abbreviation ||
            play.scoringType?.name ||
            null,
          drive_id: driveId,
          drive_description:
            drive.description || drive.displayResult || null,
          drive_result: driveResult,
          drive_plays: Array.isArray(drive.plays)
            ? drive.plays.length
            : null,
          drive_yards:
            drive.yards !== undefined && drive.yards !== null
              ? Number(drive.yards)
              : null,
          drive_time_elapsed: driveTimeElapsed,
          offense_espn_team_id: offenseEspnId || null,
          defense_espn_team_id: defenseAbbr
            ? Object.keys(teamAbbrByEspnId).find(
                (k) => teamAbbrByEspnId[k] === defenseAbbr
              ) || null
            : null,
          short_down_distance_text:
            play.shortDownDistanceText || null,
          down_distance_text: play.downDistanceText || null,
          start_possession_text: start.possessionText || null,
          end_possession_text: end.possessionText || null,
          start_yardline: startYardlineNum,
          end_yardline: endYardlineNum,
          raw_text: play.text ?? null,
          raw_short_text: shortText || null,
        };

        nflPlaysToUpsert.push(nflPlayRow);
      }
    }

    if (nflPlaysToUpsert.length > 0) {
      const { error: nflPlaysError } = await supabaseAdmin
        .from("nfl_plays")
        .upsert(nflPlaysToUpsert, {
          onConflict: "game_id,play_id",
        });

      if (nflPlaysError) {
        throw new Error(
          `Failed to upsert nfl_plays: ${nflPlaysError.message}`
        );
      }
      nflPlaysInserted = nflPlaysToUpsert.length;
    }

    // -----------------------------
    // SCORING PLAYS
    // -----------------------------
    const scoringPlays = gameData.scoringPlays || [];
    const scoringRows: any[] = [];

    if (scoringPlays.length > 0) {
      // clear existing for this game
      await supabaseAdmin
        .from("scoring_plays")
        .delete()
        .eq("game_id", numericGameId);

      for (const sp of scoringPlays) {
        const scoringPlayId =
          sp.id !== undefined && sp.id !== null ? Number(sp.id) : null;

        const teamIdEspn = sp.team?.id || null;
        const teamAbbr = teamIdEspn
          ? teamAbbrByEspnId[teamIdEspn] || null
          : null;

        const period =
          typeof sp.period === "object"
            ? sp.period?.number ?? null
            : sp.period ?? null;

        const row = {
          game_id: numericGameId,
          scoring_play_id: scoringPlayId,
          play_id: scoringPlayId ? String(scoringPlayId) : null, // if you want to join to nfl_plays by play_id
          period,
          clock: sp.clock ?? null,
          home_score:
            sp.homeScore !== undefined ? Number(sp.homeScore) : null,
          away_score:
            sp.awayScore !== undefined ? Number(sp.awayScore) : null,
          team_id: teamAbbr,
          scoring_type_id: sp.scoringType?.id ?? null,
          scoring_type_abbr: sp.scoringType?.abbreviation ?? null,
          scoring_type_name: sp.scoringType?.name ?? null,
          description: sp.text ?? null,
          raw: sp,
        };

        scoringRows.push(row);
      }

      if (scoringRows.length > 0) {
        const { error: scoringError } = await supabaseAdmin
          .from("scoring_plays")
          .insert(scoringRows);

        if (scoringError) {
          throw new Error(
            `Failed to insert scoring plays: ${scoringError.message}`
          );
        }
        scoringPlaysInserted = scoringRows.length;
      }
    }

    // Return summary
    return NextResponse.json({
      success: true,
      gameId: numericGameId,
      inserted: {
        teams: teamsInserted,
        teamStats: teamStatsInserted,
        players: playersInserted,
        playerStats: playerStatsInserted,
        nflPlays: nflPlaysInserted,
        scoringPlays: scoringPlaysInserted,
      },
    });
  } catch (error: any) {
    console.error("Import Game Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
