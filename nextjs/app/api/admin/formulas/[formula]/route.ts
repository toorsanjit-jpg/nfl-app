import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/adminApi";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ formula: string }> }
) {
  const adminCheck = await requireAdminApi(req);
  if ("response" in adminCheck) return adminCheck.response;
  const { formula } = await params;

  const supabase = adminCheck.client;
  const { error } = await supabase
    .from("admin_formulas")
    .delete()
    .eq("formula_key", formula);

  if (error) {
    return NextResponse.json({ deleted: false, _meta: { error: error.message } }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
