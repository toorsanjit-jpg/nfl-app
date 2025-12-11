export type FilterOperator =
  | "="
  | "!="
  | "<"
  | ">"
  | "<="
  | ">="
  | "between"
  | "in";

export type FilterRule = {
  field: string;
  operator: FilterOperator;
  value: any;
};

export type FilterGroup = {
  logic: "AND" | "OR";
  rules: FilterRule[];
};

export type CustomColumn = {
  name: string;
  formula: string;
};
