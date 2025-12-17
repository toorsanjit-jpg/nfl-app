import { AdminFieldsManager } from "@/components/admin/AdminFieldsManager";
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
  const fields = await fetchFields();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Admin Fields</h1>
      <p className="text-sm text-muted-foreground">
        Control visibility and filterability for each nfl_plays column.
      </p>
      <AdminFieldsManager initial={fields} />
    </div>
  );
}
