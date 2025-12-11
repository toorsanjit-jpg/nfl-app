export type TeamOffenseSummaryDTO = {
    team_id: string;
    team_name: string | null;
    season: number | null;
  
    games: number | null;
    plays: number | null;
  
    pass_plays: number | null;
    run_plays: number | null;
  
    sacks_taken: number | null;
  
    total_yards: number | null;
    pass_yards: number | null;
    rush_yards: number | null;
  
    yards_per_play: number | null;
  
    pass_yards_per_game: number | null;
    rush_yards_per_game: number | null;
  
    third_down_att: number | null;
    third_down_conv: number | null;
    third_down_pct: number | null;
  };
  