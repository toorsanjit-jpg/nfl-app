export type SavedViewScope = "league" | "team";
export type SavedViewCategory = "offense" | "defense" | "special";

export type SavedView = {
  id: string;
  user_id: string;
  scope: SavedViewScope;
  team_id: string | null;
  category: SavedViewCategory;
  name: string;
  filters: Record<string, any>;
  created_at: string;
  updated_at?: string | null;
};
