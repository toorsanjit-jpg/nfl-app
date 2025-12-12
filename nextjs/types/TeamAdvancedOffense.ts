// nextjs/types/TeamAdvancedOffense.ts

export type TeamOffenseGroupBy = "total" | "week" | "quarter" | "qb" | "rb";

export type TeamAdvancedOffenseRow = {
  team_id: string;
  label: string; // e.g. "Totals", "Week 1", "Q1", "Aidan O'Connell"
  group_by: TeamOffenseGroupBy;
  group_value: string | null; // e.g. "1", "Q1", "Aidan O'Connell"
  season: number | null;
  games: number | null;

  plays: number | null;
  pass_plays: number | null;
  run_plays: number | null;

  total_yards: number | null;
  pass_yards: number | null;
  rush_yards: number | null;
  yards_per_play: number | null;

  // These are placeholders for future advanced metrics
  success_rate?: number | null;
  epa_per_play?: number | null;
};

export type TeamAdvancedOffenseResponse = {
  groupBy: TeamOffenseGroupBy;
  rows: TeamAdvancedOffenseRow[];
};
