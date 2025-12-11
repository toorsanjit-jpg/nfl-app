export type TeamDefenseSummaryDTO = {
    team_id: string;
    team_name: string | null;
  
    plays_allowed: number;
    yards_allowed: number;
  
    pass_yards_allowed: number;
    rush_yards_allowed: number;
  
    sacks: number;
    interceptions: number;
    fumbles_recovered: number;
    turnovers_forced: number;
  };
  