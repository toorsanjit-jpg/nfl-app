import { NextRequest, NextResponse } from "next/server";
import type { AdminTableConfig } from "@/types/AdminTableConfig";
import { requireAdminApi } from "@/lib/adminApi";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;
  const { id } = await params;

  const client = adminCheck.client;

  const body = (await req.json()) as Partial<AdminTableConfig>;
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
    .update(payload)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ saved: null, _meta: { error: error.message } }, { status: 500 });
  }

  return NextResponse.json({ saved: data as AdminTableConfig });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;
  const { id } = await params;

  const client = adminCheck.client;

  const { error } = await client.from("admin_table_configs").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ deleted: false, _meta: { error: error.message } }, { status: 500 });
  }
  return NextResponse.json({ deleted: true });
}
