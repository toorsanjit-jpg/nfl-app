export type UserSavedFilter = {
  id: string;
  user_id: string;
  name: string;
  filters: Record<string, any>;
  created_at: string;
};

export type UserSavedReport = {
  id: string;
  user_id: string;
  name: string;
  settings: Record<string, any>;
  created_at: string;
};
