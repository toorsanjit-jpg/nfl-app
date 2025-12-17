import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;
  const { id } = await params;

  const client = adminCheck.client;

  const { error } = await client.from("admin_saved_views").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ deleted: false, _meta: { error: error.message } }, { status: 500 });
  }
  return NextResponse.json({ deleted: true });
}
