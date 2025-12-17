import { AdminTableFieldsManager } from "@/components/admin/AdminTableFieldsManager";
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
  const links = await fetchLinks();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Admin Table Fields</h1>
      <p className="text-sm text-muted-foreground">
        Assign fields to tables and control column ordering.
      </p>
      <AdminTableFieldsManager initial={links} />
    </div>
  );
}
