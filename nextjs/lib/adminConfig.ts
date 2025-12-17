import { createClient } from "@supabase/supabase-js";
import type {
  AdminField,
  AdminTable,
  AdminTableField,
  AdminFormula,
  AdminFilter,
} from "@/types/admin";
import { getUserContextFromCookies } from "./auth";

export type AdminConfig = {
  fields: AdminField[];
  tables: AdminTable[];
  tableFields: AdminTableField[];
  formulas: AdminFormula[];
  filters: AdminFilter[];
  _meta?: { missingSupabaseEnv?: boolean; error?: string };
};

export async function loadAdminConfig(): Promise<AdminConfig> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return { fields: [], tables: [], tableFields: [], formulas: [], filters: [], _meta: { missingSupabaseEnv: true } };
  }

  const client = createClient(supabaseUrl, serviceKey);
  const [fieldsRes, tablesRes, tableFieldsRes, formulasRes, filtersRes] =
    await Promise.all([
      client.from("admin_fields").select("*").order("order_index", { ascending: true }),
      client.from("admin_tables").select("*").order("table_key"),
      client.from("admin_table_fields").select("*").order("order_index", { ascending: true }),
      client.from("admin_formulas").select("*").order("formula_key"),
      client.from("admin_filters").select("*").order("filter_key"),
    ]);

  const meta: Record<string, any> = {};
  if (fieldsRes.error) meta.fieldsError = fieldsRes.error.message;
  if (tablesRes.error) meta.tablesError = tablesRes.error.message;
  if (tableFieldsRes.error) meta.tableFieldsError = tableFieldsRes.error.message;
  if (formulasRes.error) meta.formulasError = formulasRes.error.message;
  if (filtersRes.error) meta.filtersError = filtersRes.error.message;

  return {
    fields: (fieldsRes.data as AdminField[]) ?? [],
    tables: (tablesRes.data as AdminTable[]) ?? [],
    tableFields: (tableFieldsRes.data as AdminTableField[]) ?? [],
    formulas: (formulasRes.data as AdminFormula[]) ?? [],
    filters: (filtersRes.data as AdminFilter[]) ?? [],
    ...(Object.keys(meta).length ? { _meta: meta } : {}),
  };
}

export async function assertAdminAccess() {
  const ctx = await getUserContextFromCookies();
  if (!ctx.isAdmin) {
    const err: any = new Error("Forbidden");
    err.statusCode = ctx.user ? 403 : 401;
    throw err;
  }
  return ctx;
}
