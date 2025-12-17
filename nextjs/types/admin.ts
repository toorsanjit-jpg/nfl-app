export type AdminField = {
  field_name: string;
  label: string;
  category: "offense" | "defense" | "special" | "meta";
  is_public: boolean;
  is_logged_in: boolean;
  is_premium: boolean;
  is_filterable: boolean;
  data_type: "number" | "text" | "boolean";
  order_index: number;
  created_at?: string;
  updated_at?: string;
};

export type AdminTable = {
  table_key: string;
  title: string;
  description?: string | null;
  is_enabled: boolean;
  default_sort_field?: string | null;
  default_sort_dir?: "asc" | "desc" | null;
  created_at?: string;
  updated_at?: string;
};

export type AdminTableField = {
  table_key: string;
  field_name: string;
  order_index: number;
  is_visible: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AdminFormula = {
  formula_key: string;
  label: string;
  description?: string | null;
  sql_expression: string;
  applies_to: "offense" | "defense" | "special";
  is_premium: boolean;
  is_enabled: boolean;
  created_at?: string;
  updated_at?: string;
};

export type AdminFilter = {
  filter_key: string;
  field_name: string;
  operator: "=" | "!=" | "<" | ">" | "<=" | ">=" | "between" | "in";
  is_public: boolean;
  is_premium: boolean;
  ui_type: "toggle" | "dropdown" | "multiselect";
  created_at?: string;
  updated_at?: string;
};
