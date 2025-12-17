import { AdminSchemaBuilder } from "@/components/admin/AdminSchemaBuilder";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { getUserContextFromCookies } from "@/lib/auth";
import { getBaseUrl } from "@/lib/urlHelpers";
import type { AdminTableConfig } from "@/types/AdminTableConfig";
import type { IntrospectedColumn } from "@/lib/supabaseIntrospect";

export const dynamic = "force-dynamic";

async function fetchConfigs(): Promise<{
  configs: AdminTableConfig[];
  missingEnv?: boolean;
}> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/admin/configs`, { cache: "no-store" });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    if (json?._meta?.missingSupabaseEnv) return { configs: [], missingEnv: true };
    return { configs: [] };
  }
  const json = await res.json();
  return { configs: (json.configs as AdminTableConfig[]) ?? [], missingEnv: json?._meta?.missingSupabaseEnv };
}

async function fetchColumns(): Promise<{ columns: IntrospectedColumn[]; missingEnv?: boolean }> {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/admin/introspect?table=nfl_plays`, { cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?._meta?.missingSupabaseEnv) {
    return { columns: [], missingEnv: true };
  }
  return { columns: (json.columns as IntrospectedColumn[]) ?? [] };
}

export default async function AdminSchemaPage() {
  const ctx = await getUserContextFromCookies();
  if (!ctx.userId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Not authorized</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Please sign in as an admin.
          </CardContent>
        </Card>
      </div>
    );
  }
  if (!ctx.isAdmin || !ctx.isPremium) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Admin access required</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            You must be an admin to use the schema builder.
          </CardContent>
        </Card>
      </div>
    );
  }

  const [{ configs, missingEnv: missingEnvConfigs }, { columns, missingEnv: missingEnvCols }] =
    await Promise.all([fetchConfigs(), fetchColumns()]);

  const missingEnv = missingEnvConfigs || missingEnvCols;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold">Schema Builder</h1>
        <p className="text-sm text-muted-foreground">
          Define admin tables, choose columns, and configure filters/formulas.
        </p>
      </div>
      <AdminSchemaBuilder
        initialConfigs={configs}
        columns={columns}
        missingEnv={missingEnv}
      />
    </div>
  );
}
