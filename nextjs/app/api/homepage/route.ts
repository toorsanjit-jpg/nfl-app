import { NextResponse } from "next/server";
import { getUserContextFromRequest } from "@/lib/auth";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type TableResult = {
  table_key: string;
  title: string;
  name: string;
  access_level: "public" | "premium" | "admin";
  columns: string[];
  rows: Record<string, any>[];
  row_limit?: number | null;
  _meta?: Record<string, any>;
};

export async function GET(req: Request) {
  const auth = await getUserContextFromRequest(req);
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    return NextResponse.json({
      tables: [] as TableResult[],
      _meta: { missingSupabaseEnv: true },
    });
  }

  const { data: tables, error } = await supabase
    .from("admin_tables")
    .select("*")
    .eq("page", "homepage")
    .eq("is_enabled", true)
    .order("created_at", { ascending: true });

  if (error || !tables) {
    return NextResponse.json({
      tables: [] as TableResult[],
      _meta: { error: error?.message ?? "Failed to load tables" },
    });
  }

  const visibleTables = (tables as any[]).filter((t) => {
    if (t.access_level === "admin") return auth.isAdmin;
    if (t.access_level === "premium") return auth.isAdmin || auth.isPremium;
    return true;
  });

  const results: TableResult[] = [];
  for (const tbl of visibleTables) {
    let query = supabase.from(tbl.source_table).select();
    if (tbl.row_limit) query = query.limit(tbl.row_limit);

    const { data: rows, error: rowErr } = await query;
    const columns = rows && rows.length ? Object.keys(rows[0] as any) : [];

    results.push({
      table_key: tbl.table_key,
      title: tbl.title,
      name: tbl.name,
      access_level: tbl.access_level,
      columns,
      rows: (rows as any[]) ?? [],
      row_limit: tbl.row_limit,
      ...(rowErr ? { _meta: { error: rowErr.message } } : {}),
    });
  }

  return NextResponse.json({ tables: results });
}
