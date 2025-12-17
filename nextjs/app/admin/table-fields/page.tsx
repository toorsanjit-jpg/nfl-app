import { AdminTableFieldsManager } from "@/components/admin/AdminTableFieldsManager";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getUserContextFromCookies } from "@/lib/auth";
import { getBaseUrl } from "@/lib/urlHelpers";
import type { AdminTableField } from "@/types/admin";

export const dynamic = "force-dynamic";

async function fetchLinks(): Promise<AdminTableField[]> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/admin/tableFields`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.tableFields as AdminTableField[]) ?? [];
}

export default async function AdminTableFieldsPage() {
  const ctx = await getUserContextFromCookies();
  if (!ctx.userId || !ctx.isAdmin || !ctx.isPremium) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Admin access denied</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            You must be a premium admin to manage table field mappings.
          </CardContent>
        </Card>
      </div>
    );
  }

  const links = await fetchLinks();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Admin · Table Fields</h1>
      <p className="text-sm text-muted-foreground">
        Assign fields to tables and control column ordering.
      </p>
      <AdminTableFieldsManager initial={links} />
    </div>
  );
}
