import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "./supabaseAdmin";
import { createRouteSupabase, createServerSupabase, hasSupabaseEnv } from "./supabaseServer";
import type { UserTier } from "./userTier";

export type UserContext = {
  user: User | null;
  userId: string | null;
  isPremium: boolean;
  isAdmin: boolean;
  tier: UserTier;
  token: string | null;
  missingSupabaseEnv?: boolean;
};

const ADMIN_EMAIL = "toorsanjit@gmail.com";

const DEFAULT_CONTEXT: UserContext = {
  user: null,
  userId: null,
  isPremium: false,
  isAdmin: false,
  tier: "anonymous",
  token: null,
};

type ProfileFlags = {
  isAdmin: boolean | null;
  isPremium: boolean | null;
};

function deriveTier(user: User | null, isPremium: boolean): UserTier {
  if (!user) return "anonymous";
  return isPremium ? "premium" : "free";
}

function adminFromMetadata(user: User | null, profileIsAdmin?: boolean | null) {
  if (!user) return false;
  if (user.email?.toLowerCase() === ADMIN_EMAIL) return true;
  const meta = (user.user_metadata || {}) as Record<string, any>;
  const appMeta = (user.app_metadata || {}) as Record<string, any>;
  if (meta.is_admin === true || meta.is_admin === "true") return true;
  if (appMeta.is_admin === true || appMeta.is_admin === "true") return true;
  if (profileIsAdmin != null) return Boolean(profileIsAdmin);
  return false;
}

function premiumFromMetadata(
  user: User | null,
  profileIsPremium?: boolean | null
) {
  if (profileIsPremium != null) return Boolean(profileIsPremium);
  if (!user) return false;
  const meta = (user.user_metadata || {}) as Record<string, any>;
  const appMeta = (user.app_metadata || {}) as Record<string, any>;
  if (meta.is_premium != null) return Boolean(meta.is_premium);
  if (appMeta.is_premium != null) return Boolean(appMeta.is_premium);
  return false;
}

async function fetchProfileFlags(
  client: SupabaseClient | null,
  userId: string
): Promise<ProfileFlags> {
  if (!client) return { isAdmin: null, isPremium: null };
  try {
    const { data, error } = await client
      .from("profiles")
      .select("is_admin,is_premium")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.warn("profile lookup error:", error.message);
      return { isAdmin: null, isPremium: null };
    }
    const record = data as any;
    return {
      isAdmin: record?.is_admin ?? null,
      isPremium: record?.is_premium ?? null,
    };
  } catch (err) {
    console.warn("profile lookup exception:", err);
    return { isAdmin: null, isPremium: null };
  }
}

async function buildContextFromClient(
  supabase: SupabaseClient | null
): Promise<UserContext> {
  if (!supabase) return { ...DEFAULT_CONTEXT, missingSupabaseEnv: true };

  const { data, error } = await supabase.auth.getSession();
  if (error) {
    return { ...DEFAULT_CONTEXT, token: null };
  }

  const session = data.session;
  const user = session?.user ?? null;
  const userId = user?.id ?? null;
  const token = session?.access_token ?? null;

  let profileFlags: ProfileFlags = { isAdmin: null, isPremium: null };
  if (userId) {
    const profileClient = getSupabaseAdminClient() ?? supabase;
    profileFlags = await fetchProfileFlags(profileClient, userId);
  }

  const isAdmin = adminFromMetadata(user, profileFlags.isAdmin);
  const isPremium = premiumFromMetadata(user, profileFlags.isPremium);
  const tier = deriveTier(user, isPremium);

  return {
    user,
    userId,
    isPremium,
    isAdmin,
    tier,
    token,
  };
}

export async function getUserContextFromRequest(
  _req: Request
): Promise<UserContext> {
  if (!hasSupabaseEnv()) {
    return { ...DEFAULT_CONTEXT, missingSupabaseEnv: true };
  }
  const supabase = createRouteSupabase();
  return buildContextFromClient(supabase);
}

export async function getUserContextFromCookies(): Promise<UserContext> {
  const supabase = createServerSupabase();
  return buildContextFromClient(supabase);
}

export function getAdvancedPermissions(ctx: UserContext) {
  const canAccessAdvanced = ctx.tier !== "anonymous";
  const canUseSavedViews = ctx.isPremium;
  const canUseFullFilters = ctx.isPremium;
  const canAccessTeamAdvanced = ctx.isPremium;
  const isAdmin = ctx.isAdmin;

  return {
    ...ctx,
    canAccessAdvanced,
    canUseSavedViews,
    canUseFullFilters,
    canAccessTeamAdvanced,
    isAdmin,
  };
}

export function isAdminUser(user: User | null) {
  return adminFromMetadata(user);
}

export async function requireAdmin() {
  const ctx = await getUserContextFromCookies();
  if (ctx.missingSupabaseEnv) {
    return { authorized: false, redirectTo: "/login", ctx, reason: "missing-env" as const };
  }
  if (!ctx.userId) {
    return { authorized: false, redirectTo: "/login", ctx, reason: "unauthenticated" as const };
  }
  if (!ctx.isAdmin) {
    return { authorized: false, redirectTo: "/", ctx, reason: "not-admin" as const };
  }
  return { authorized: true, ctx };
}
