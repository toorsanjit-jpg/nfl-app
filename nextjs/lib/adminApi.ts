import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getUserContextFromRequest, type UserContext } from "./auth";
import { getSupabaseAdminClientOrThrow } from "./supabaseAdmin";

type AdminCheck =
  | { response: ReturnType<typeof NextResponse.json> }
  | { client: SupabaseClient; auth: UserContext };

export async function requireAdminApi(req: Request): Promise<AdminCheck> {
  const auth = await getUserContextFromRequest(req);
  if (!auth.userId) {
    return {
      response: NextResponse.json(
        { _meta: { restricted: true, reason: "login-required" } },
        { status: 401 }
      ),
    };
  }
  if (!auth.isAdmin) {
    return {
      response: NextResponse.json(
        { _meta: { restricted: true, reason: "admin-required" } },
        { status: 403 }
      ),
    };
  }

  try {
    const client = getSupabaseAdminClientOrThrow();
    return { client, auth };
  } catch (error: any) {
    return {
      response: NextResponse.json(
        {
          error: "Missing Supabase service role credentials",
          _meta: { missingSupabaseEnv: true },
        },
        { status: 500 }
      ),
    };
  }
}
