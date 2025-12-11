export type TeamSpecialSummaryDTO = {
    team_id: string;
    team_name: string | null;
    season: number | null;
    games: number | null;
  
    fg_made: number | null;
    fg_att: number | null;
  
    xp_made: number | null;
    xp_att: number | null;
  
    punts: number | null;
    punt_yds: number | null;
    punt_avg: number | null;
  
    kr_yds: number | null;
    pr_yds: number | null;
  
    st_points: number | null;
  };
  