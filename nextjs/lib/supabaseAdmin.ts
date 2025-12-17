import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function getSupabaseAdminClient(): SupabaseClient | null {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  try {
    return createClient(supabaseUrl, serviceRoleKey);
  } catch {
    return null;
  }
}
