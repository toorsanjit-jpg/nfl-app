import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export function createServerSupabase(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    return createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          const store = cookies() as any;
          return store.get?.(name)?.value;
        },
        set(name: string, value: string, options: any) {
          const store = cookies() as any;
          store.set?.({ name, value, ...options });
        },
        remove(name: string, options: any) {
          const store = cookies() as any;
          store.set?.({ name, value: "", ...options });
        },
      },
    });
  } catch (error) {
    console.warn("Failed to create server Supabase client:", error);
    return null;
  }
}

// Legacy helpers that now delegate to the SSR client
export function getSupabaseEnv() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || null,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null,
  };
}

export function hasSupabaseEnv() {
  const { url, anonKey } = getSupabaseEnv();
  return Boolean(url && anonKey);
}

export function getSupabaseServerClient(): SupabaseClient | null {
  if (!hasSupabaseEnv()) return null;
  return createServerSupabase();
}

export function createRouteSupabase(): SupabaseClient | null {
  if (!hasSupabaseEnv()) return null;
  return createServerSupabase();
}
