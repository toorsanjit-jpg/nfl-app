import { NextRequest, NextResponse } from "next/server";
import type { AdminTableConfig } from "@/types/AdminTableConfig";
import { requireAdminApi } from "@/lib/adminApi";

export async function GET(req: NextRequest) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;
  const client = adminCheck.client;

  const { data, error } = await client
    .from("admin_table_configs")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ configs: [] as AdminTableConfig[], _meta: { error: error.message } }, { status: 500 });
  }

  return NextResponse.json({ configs: (data as AdminTableConfig[]) ?? [] });
}

export async function POST(req: NextRequest) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;
  const client = adminCheck.client;

  const body = (await req.json()) as Partial<AdminTableConfig>;
  if (!body.name || !body.slug || !body.source_table) {
    return NextResponse.json(
      { saved: null, _meta: { error: "Missing required fields" } },
      { status: 400 }
    );
  }

  const payload = {
    name: body.name,
    slug: body.slug,
    source_table: body.source_table,
    columns: body.columns ?? [],
    available_filters: body.available_filters ?? {},
    default_filters: body.default_filters ?? {},
    formulas: body.formulas ?? [],
  };

  const { data, error } = await client
    .from("admin_table_configs")
    .insert(payload)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ saved: null, _meta: { error: error.message } }, { status: 500 });
  }

  return NextResponse.json({ saved: data as AdminTableConfig });
}
