import { cookies as nextCookies } from "next/headers";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import type { UserTier } from "./userTier";

export type UserContext = {
  user: User | null;
  userId: string | null;
  isPremium: boolean;
  tier: UserTier;
  token: string | null;
  missingSupabaseEnv?: boolean;
};

const DEFAULT_CONTEXT: UserContext = {
  user: null,
  userId: null,
  isPremium: false,
  tier: "anonymous",
  token: null,
};

type SupabaseCreds = {
  url: string | null;
  anonKey: string | null;
  serviceKey: string | null;
};

function getSupabaseCreds(): SupabaseCreds {
  return {
    url: process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || null,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
  };
}

function extractTokenFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const [rawKey, ...rest] = part.trim().split("=");
    const key = rawKey?.trim();
    if (!key) continue;
    if (key === "sb-access-token" || key === "supabase-auth-token") {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

function getTokenFromRequest(req: Request): string | null {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice("bearer ".length);
  }
  return extractTokenFromCookieHeader(req.headers.get("cookie"));
}

function getTokenFromCookiesStore(): string | null {
  try {
    const store = nextCookies();
    return (
      store.get("sb-access-token")?.value ||
      store.get("supabase-auth-token")?.value ||
      null
    );
  } catch {
    return null;
  }
}

function deriveTier(user: User | null, isPremium: boolean): UserTier {
  if (!user) return "anonymous";
  return isPremium ? "premium" : "free";
}

function buildClient(
  url: string,
  key: string,
  token: string | null
): SupabaseClient {
  const options = token
    ? {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    : undefined;
  return createClient(url, key, options);
}

async function fetchProfileIsPremium(
  client: SupabaseClient,
  userId: string
): Promise<boolean | null> {
  try {
    const { data, error } = await client
      .from("profiles")
      .select("is_premium")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      console.warn("profile lookup error:", error.message);
      return null;
    }
    return data?.is_premium ?? null;
  } catch (err) {
    console.warn("profile lookup exception:", err);
    return null;
  }
}

async function resolveUserContext(
  token: string | null,
  creds: SupabaseCreds
): Promise<UserContext> {
  if (!creds.url || !creds.anonKey) {
    return { ...DEFAULT_CONTEXT, missingSupabaseEnv: true };
  }

  if (!token) {
    return { ...DEFAULT_CONTEXT, token: null };
  }

  const supabase = buildClient(creds.url, creds.anonKey, token);
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData?.user) {
    return {
      ...DEFAULT_CONTEXT,
      token,
      user: null,
      userId: null,
      tier: "anonymous",
    };
  }

  const user = authData.user;
  const userId = user.id;

  let isPremium =
    Boolean(
      (user.app_metadata as any)?.is_premium ??
        (user.user_metadata as any)?.is_premium
    );

  if (creds.serviceKey) {
    const adminClient = buildClient(creds.url, creds.serviceKey, token);
    const profilePremium = await fetchProfileIsPremium(adminClient, userId);
    if (profilePremium != null) isPremium = profilePremium;
  } else {
    const profilePremium = await fetchProfileIsPremium(supabase, userId);
    if (profilePremium != null) isPremium = profilePremium;
  }

  return {
    user,
    userId,
    isPremium,
    tier: deriveTier(user, isPremium),
    token,
  };
}

export async function getUserContextFromRequest(
  req: Request
): Promise<UserContext> {
  const creds = getSupabaseCreds();
  const token = getTokenFromRequest(req);
  return resolveUserContext(token, creds);
}

export async function getUserContextFromCookies(): Promise<UserContext> {
  const creds = getSupabaseCreds();
  const token = getTokenFromCookiesStore();
  return resolveUserContext(token, creds);
}

export function getAdvancedPermissions(ctx: UserContext) {
  const canAccessAdvanced = ctx.tier !== "anonymous";
  const canUseSavedViews = ctx.isPremium;
  const canUseFullFilters = ctx.isPremium;
  const canAccessTeamAdvanced = ctx.isPremium;

  return {
    ...ctx,
    canAccessAdvanced,
    canUseSavedViews,
    canUseFullFilters,
    canAccessTeamAdvanced,
  };
}
