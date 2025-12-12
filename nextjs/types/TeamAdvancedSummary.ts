export type TeamAdvancedOffenseSummary = {
  team_id: string;
  season: number | null;
  week: number | null;
  plays_offense: number | null;
  pass_plays: number | null;
  run_plays: number | null;
  sacks_taken: number | null;
  ints_thrown: number | null;
  touchdowns: number | null;
  yards_gained_sum: number | null;
  yac_sum: number | null;
  first_downs_gained: number | null;
  success_rate: number | null;
  explosive_pass: number | null;
  explosive_run: number | null;
  shotgun_rate: number | null;
  no_huddle_rate: number | null;
};

export type TeamAdvancedDefenseSummary = {
  team_id: string;
  season: number | null;
  week: number | null;
  plays_defense: number | null;
  sacks: number | null;
  qb_hits: number | null;
  ints: number | null;
  touchdowns_allowed: number | null;
  yards_allowed_sum: number | null;
  stops: number | null;
  explosive_allowed_pass: number | null;
  explosive_allowed_run: number | null;
};

export type TeamAdvancedSpecialSummary = {
  team_id: string;
  season: number | null;
  week: number | null;
  punt_plays: number | null;
  kickoff_plays: number | null;
  fg_att: number | null;
  xp_att: number | null;
  st_plays_total: number | null;
};
