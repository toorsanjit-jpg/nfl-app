import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserContextFromRequest } from "@/lib/auth";

function missingEnv(body: Record<string, any>) {
  return NextResponse.json({ ...body, _meta: { missingSupabaseEnv: true } });
}

function requireAdmin(auth: any) {
  if (!auth.userId) {
    return NextResponse.json(
      { _meta: { restricted: true, reason: "login-required" } },
      { status: 401 }
    );
  }
  if (!auth.isAdmin || !auth.isPremium) {
    return NextResponse.json(
      { _meta: { restricted: true, reason: "admin-required" } },
      { status: 403 }
    );
  }
  return null;
}

function getClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) return null;
  return createClient(supabaseUrl, serviceKey);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUserContextFromRequest(req);
  const gate = requireAdmin(auth);
  if (gate) return gate;
  const { id } = await params;

  const client = getClient();
  if (!client) return missingEnv({ deleted: false });

  const { error } = await client.from("admin_saved_views").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ deleted: false, _meta: { error: error.message } }, { status: 500 });
  }
  return NextResponse.json({ deleted: true });
}
