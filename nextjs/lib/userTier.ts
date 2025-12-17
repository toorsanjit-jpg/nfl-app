export type UserTier = "anonymous" | "free" | "premium";

export function getUserTier(session: any): UserTier {
  if (!session) return "anonymous";
  const isPremium =
    Boolean(
      session.is_premium ??
        session.isPremium ??
        session?.user?.is_premium ??
        session?.user?.app_metadata?.is_premium ??
        session?.user?.user_metadata?.is_premium
    );
  if (isPremium) return "premium";
  return session.user || session.user_id || session.userId ? "free" : "anonymous";
}
