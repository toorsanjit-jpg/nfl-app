import { AdminFieldsManager } from "@/components/admin/AdminFieldsManager";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getUserContextFromCookies } from "@/lib/auth";
import { getBaseUrl } from "@/lib/urlHelpers";
import type { AdminField } from "@/types/admin";

export const dynamic = "force-dynamic";

async function fetchFields(): Promise<AdminField[]> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/admin/fields`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.fields as AdminField[]) ?? [];
}

export default async function AdminFieldsPage() {
  const ctx = await getUserContextFromCookies();
  if (!ctx.userId || !ctx.isAdmin || !ctx.isPremium) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Admin access denied</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            You must be a premium admin to manage fields.
          </CardContent>
        </Card>
      </div>
    );
  }

  const fields = await fetchFields();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Admin · Fields</h1>
      <p className="text-sm text-muted-foreground">
        Control visibility and filterability for each nfl_plays column.
      </p>
      <AdminFieldsManager initial={fields} />
    </div>
  );
}
