import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUserContextFromRequest } from "@/lib/auth";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getUserContextFromRequest(req);
  const { id } = await params;

  if (auth.missingSupabaseEnv) {
    return NextResponse.json({
      deleted: false,
      _meta: { missingSupabaseEnv: true },
    });
  }

  if (!auth.userId) {
    return NextResponse.json(
      { deleted: false, _meta: { restricted: true, reason: "login-required" } },
      { status: 401 }
    );
  }

  if (!auth.isPremium) {
    return NextResponse.json(
      { deleted: false, _meta: { restricted: true, reason: "premium-required" } },
      { status: 403 }
    );
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({
      deleted: false,
      _meta: { missingSupabaseEnv: true },
    });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const { error } = await supabase
    .from("saved_views")
    .delete()
    .eq("id", id)
    .eq("user_id", auth.userId);

  if (error) {
    console.error("savedViews DELETE error:", error);
    return NextResponse.json({
      deleted: false,
      _meta: { error: error.message },
    });
  }

  return NextResponse.json({ deleted: true });
}
