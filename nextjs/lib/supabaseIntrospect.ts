import { createClient } from "@supabase/supabase-js";

export type IntrospectedColumn = { column_name: string; data_type: string };

export async function introspectColumns(table: string) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return { columns: [] as IntrospectedColumn[], _meta: { missingSupabaseEnv: true } };
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase
    .from("information_schema.columns")
    .select("column_name, data_type")
    .eq("table_name", table)
    .order("ordinal_position", { ascending: true });

  if (error) {
    return {
      columns: [] as IntrospectedColumn[],
      _meta: { error: error.message },
    };
  }

  return { columns: (data as IntrospectedColumn[]) ?? [] };
}
