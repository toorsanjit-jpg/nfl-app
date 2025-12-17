import { AdminUsersManager } from "@/components/admin/AdminUsersManager";
import { getBaseUrl } from "@/lib/urlHelpers";
import type { AdminUser } from "@/types/admin";

export const dynamic = "force-dynamic";

async function fetchUsers(): Promise<AdminUser[]> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/admin/users`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.users as AdminUser[]) ?? [];
}

export default async function AdminUsersPage() {
  const users = await fetchUsers();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Admin Users</h1>
        <p className="text-sm text-muted-foreground">
          Manage admin and premium flags. Changes save immediately and are logged.
        </p>
      </div>
      <AdminUsersManager initial={users} />
    </div>
  );
}
