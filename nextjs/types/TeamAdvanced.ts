// nextjs/types/TeamAdvanced.ts

export type TeamOffenseRow = {
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

export type TeamDefenseRow = {
  team_id: string;
  team_name: string | null;
  season: number | null;

  games: number | null;

  plays_defended: number | null;
  pass_plays_defended: number | null;
  run_plays_defended: number | null;
  sacks_made: number | null;

  yards_allowed: number | null;
  pass_yards_allowed: number | null;
  rush_yards_allowed: number | null;

  yards_per_play_allowed: number | null;
  pass_yards_per_game_allowed: number | null;
  rush_yards_per_game_allowed: number | null;

  third_down_att_def: number | null;
  third_down_conv_def: number | null;
  third_down_pct_def: number | null;
};

export type AdvancedGroupBy =
  | "team" // default – one row per team+season
  | "season" // (future) aggregate across teams by season
  | "team_season"; // explicit team+season (same as "team" right now)
