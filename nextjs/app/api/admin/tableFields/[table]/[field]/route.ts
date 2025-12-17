import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ table: string; field: string }> }
) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;
  const { table, field } = await params;

  const supabase = adminCheck.client;
  const { error } = await supabase
    .from("admin_table_fields")
    .delete()
    .eq("table_key", table)
    .eq("field_name", field);

  if (error) {
    return NextResponse.json({ deleted: false, _meta: { error: error.message } }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
