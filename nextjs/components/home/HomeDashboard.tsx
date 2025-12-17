"use client";

import { useEffect, useState } from "react";
import HomeTable from "./HomeTable";

type TableResult = {
  table_key: string;
  title: string;
  name: string;
  access_level: "public" | "premium" | "admin";
  columns: string[];
  rows: Record<string, any>[];
  default_sort_field?: string | null;
  default_sort_dir?: "asc" | "desc" | null;
  row_limit?: number | null;
  _meta?: Record<string, any>;
};

type ApiResponse = {
  tables: TableResult[];
  _meta?: Record<string, any>;
};

export default function HomeDashboard() {
  const [data, setData] = useState<ApiResponse>({ tables: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/homepage", { cache: "no-store" });
        const json = (await res.json()) as ApiResponse;
        setData(json);
      } catch {
        setData({ tables: [], _meta: { error: "Failed to load homepage data" } });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">Loading homepage data…</div>;
  }

  if (data._meta?.missingSupabaseEnv) {
    return (
      <div className="rounded-xl border p-4 text-sm text-red-600">
        Supabase environment is not configured. Homepage data is unavailable.
      </div>
    );
  }

  if (!data.tables.length) {
    return (
      <div className="rounded-xl border p-4 text-sm text-muted-foreground">
        No tables configured. Add rows to admin_tables with page="homepage".
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data.tables.map((t) => (
        <section key={t.table_key} className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">{t.title || t.name}</h2>
              <p className="text-xs text-muted-foreground">
                {t.access_level === "public"
                  ? "Public"
                  : t.access_level === "premium"
                    ? "Premium / Admin"
                    : "Admin only"}
              </p>
            </div>
            {t.row_limit ? (
              <span className="text-xs text-muted-foreground">Limit: {t.row_limit}</span>
            ) : null}
          </div>

          {t._meta?.error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              {t._meta.error}
            </div>
          ) : null}

          <HomeTable rows={t.rows} columns={t.columns} title={t.title || t.name} />
        </section>
      ))}
    </div>
  );
}
