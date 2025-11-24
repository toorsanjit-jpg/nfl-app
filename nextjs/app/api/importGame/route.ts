import axios from "axios";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// --- Helpers --------------------------------------------------

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
  if (text.includes("kicks off") || text.includes("kickoff"))
    return "kickoff";
  if (text.includes("field goal")) return "field-goal";
  if (text.includes("extra point")) return "extra-point";
  if (text.includes("two-point") || text.includes("two pt"))
    return "two-point-attempt";
  if (text.includes("spikes the ball") || text.includes("spike"))
    return "qb-spike";
  if (text.includes("kneels") || text.includes("kneel"))
    return "qb-kneel";

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

// --- Main handler --------------------------------------------------

export async function POST(request: Request) {
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

    let teamsInserted = 0;
    let playersInserted = 0;
    let teamStatsInserted = 0;
    let playerStatsInserted = 0;
    let playsInserted = 0;

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

    const { error: gameError } = await supabaseAdmin.from("games").upsert({
      id: gameData.id,
      season: gameData.season?.year ?? null,
      week: weekNumber,
      home_team_id: homeTeam.abbreviation,
      away_team_id: awayTeam.abbreviation,
      home_score: homeScore,
      away_score: awayScore,
      date: competition.date ? new Date(competition.date).toISOString() : null,
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
          game_id: gameData.id,
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
          third_down_eff: thirdDownEffRaw
            ? String(thirdDownEffRaw)
            : null,
          third_down_pct: null,
          fourth_down_eff: fourthDownEffRaw
            ? String(fourthDownEffRaw)
            : null,
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
    // PLAYER & PLAYER-GAME STATS (ALL CATEGORIES)
    // -----------------------------
    if (boxScore?.players) {
      const playersToUpsert: any[] = [];
      const playerStatsToUpsert: any[] = [];

      for (const playerCategory of boxScore.players) {
        const categoryName = playerCategory.name || null; // e.g. "passing", "rushing"
        const categoryTeamAbbr = playerCategory.team?.abbreviation || null;

        const statisticsArray = playerCategory.statistics || [];
        for (const statsGroup of statisticsArray) {
          const keys: string[] = statsGroup.keys || [];
          const labels: string[] = statsGroup.labels || [];
          const athletes = statsGroup.athletes || [];

          for (const athlete of athletes) {
            const player = athlete.athlete;
            if (!player?.id) continue;

            const playerId = String(player.id);
            const playerTeamAbbr =
              categoryTeamAbbr || player.team?.abbreviation || null;

            const playerData = {
              id: playerId,
              name:
                player.displayName || player.fullName || player.name || null,
              first_name: player.firstName || null,
              last_name: player.lastName || null,
              position: player.position?.abbreviation || null,
              current_team_id: playerTeamAbbr,
              headshot_url: player.headshot?.href || null,
            };

            playersToUpsert.push(playerData);

            const statsRaw: Record<string, any> = {};
            const statsParsed: Record<string, any> = {};
            const statValues: any[] = athlete.stats || [];

            for (let i = 0; i < statValues.length; i++) {
              const key = keys[i] ?? `col_${i}`;
              const label = labels[i] ?? key;
              const value = statValues[i];

              statsRaw[key] = value;

              if (
                typeof value === "number" ||
                (typeof value === "string" &&
                  value !== "" &&
                  !Number.isNaN(Number(value)) &&
                  !value.includes("/") &&
                  !value.includes("-"))
              ) {
                statsParsed[label] = Number(value);
              } else {
                statsParsed[label] = value;
              }
            }

            playerStatsToUpsert.push({
              game_id: gameData.id,
              team_id: playerTeamAbbr,
              player_id: playerId,
              category: categoryName,
              stats_raw: statsRaw,
              stats_parsed: statsParsed,
            });
          }
        }
      }

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

      if (playerStatsToUpsert.length > 0) {
        const { error: playerStatsError } = await supabaseAdmin
          .from("player_game_stats")
          .upsert(playerStatsToUpsert, {
            onConflict: "game_id,player_id,category",
          });

        if (playerStatsError) {
          throw new Error(
            `Failed to insert player stats: ${playerStatsError.message}`
          );
        }
        playerStatsInserted = playerStatsToUpsert.length;
      }
    }

    // -----------------------------
    // PLAY-BY-PLAY (drives.previous[].plays[])
    // -----------------------------
    const drives = gameData.drives?.previous || [];
    const playsToUpsert: any[] = [];

    for (const drive of drives) {
      const plays = drive.plays || [];
      for (const play of plays) {
        const playId: string =
          play.id || `${gameData.id}-${play.sequenceNumber}`;

        const period = play.period?.number ?? null;
        const clock = play.clock?.displayValue ?? null;

        const start = play.start || {};
        const down = start.down ?? null;
        const distance = start.distance ?? null;
        const yardsToGoal = start.yardsToEndzone ?? null;
        const yardLine = start.yardLine ?? null;

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

        playsToUpsert.push({
          id: playId,
          game_id: gameData.id,
          team_id: offenseAbbr,
          defense_team_id: defenseAbbr,
          sequence: seq,
          quarter: period,
          clock: clock,
          down: down,
          distance: distance,
          yards_to_goal: yardsToGoal,
          yard_line: yardLine,
          play_type: playType,
          yards_gained: rawYards,
          success: success,
          description: description,
          raw: play,
        });
      }
    }

    if (playsToUpsert.length > 0) {
      const { error: playsError } = await supabaseAdmin
        .from("plays")
        .upsert(playsToUpsert, { onConflict: "id" });

      if (playsError) {
        throw new Error(`Failed to upsert plays: ${playsError.message}`);
      }
      playsInserted = playsToUpsert.length;
    }

    // Return summary
    return NextResponse.json({
      success: true,
      gameId,
      inserted: {
        teams: teamsInserted,
        players: playersInserted,
        teamStats: teamStatsInserted,
        playerStats: playerStatsInserted,
        plays: playsInserted,
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
