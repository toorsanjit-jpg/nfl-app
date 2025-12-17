import { AdminTablesManager } from "@/components/admin/AdminTablesManager";
import { getBaseUrl } from "@/lib/urlHelpers";
import type { AdminTable } from "@/types/admin";

export const dynamic = "force-dynamic";

async function fetchTables(): Promise<AdminTable[]> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/admin/tables`, { cache: "no-store" });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.tables as AdminTable[]) ?? [];
}

export default async function AdminTablesPage() {
  const tables = await fetchTables();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
      <h1 className="text-2xl font-bold">Admin Tables</h1>
      <p className="text-sm text-muted-foreground">
        Define table groupings and defaults for offense/defense/special/custom.
      </p>
      <AdminTablesManager initial={tables} />
    </div>
  );
}
