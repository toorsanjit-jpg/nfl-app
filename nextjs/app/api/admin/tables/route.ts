import { NextResponse } from "next/server";
import type { AdminTable } from "@/types/admin";
import { requireAdminApi } from "@/lib/adminApi";

export async function GET(req: Request) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;

  const supabase = adminCheck.client;
  const { data, error } = await supabase
    .from("admin_tables")
    .select("*")
    .order("table_key");

  if (error) {
    return NextResponse.json({ tables: [] as AdminTable[], _meta: { error: error.message } }, { status: 500 });
  }

  return NextResponse.json({ tables: (data as AdminTable[]) ?? [] });
}

export async function POST(req: Request) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;

  const body = (await req.json()) as Partial<AdminTable>;
  if (!body.table_key || !body.title || !body.name || !body.source_table || !body.page || !body.access_level) {
    return NextResponse.json(
      { saved: null, _meta: { error: "Missing required fields" } },
      { status: 400 }
    );
  }

  const supabase = adminCheck.client;
  const payload = {
    table_key: body.table_key,
    name: body.name,
    source_table: body.source_table,
    page: body.page,
    access_level: body.access_level,
    title: body.title,
    description: body.description ?? null,
    is_enabled: body.is_enabled ?? true,
    default_sort_field: body.default_sort_field ?? null,
    default_sort_dir: body.default_sort_dir ?? null,
    row_limit: body.row_limit ?? null,
  };

  const { data, error } = await supabase
    .from("admin_tables")
    .upsert(payload, { onConflict: "table_key" })
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ saved: null, _meta: { error: error.message } }, { status: 500 });
  }

  return NextResponse.json({ saved: data as AdminTable });
}
