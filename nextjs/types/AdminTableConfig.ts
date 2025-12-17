export type AdminTableConfig = {
  id: string;
  name: string;
  slug: string | null;
  source_table: string;
  columns: string[];
  available_filters: {
    season?: boolean;
    week?: boolean;
    playType?: boolean;
    shotgun?: boolean;
    noHuddle?: boolean;
    offenseTeam?: boolean;
    defenseTeam?: boolean;
  };
  default_filters: {
    season?: number | "latest" | null;
    week?: number | "latest" | null;
  };
  formulas: {
    label: string;
    key: string;
    expression: string;
  }[];
  created_at?: string;
  updated_at?: string;
};
