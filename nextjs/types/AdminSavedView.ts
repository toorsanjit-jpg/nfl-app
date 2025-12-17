export type AdminSavedView = {
  id: string;
  config_id: string;
  user_id: string | null;
  name: string;
  filters: Record<string, any>;
  created_at?: string;
  updated_at?: string;
};
