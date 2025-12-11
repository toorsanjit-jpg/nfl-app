export type UserTier = "anonymous" | "free" | "premium";

export function getUserTier(session: any): UserTier {
  if (!session) return "anonymous";
  return session.user?.tier || "free";
}
