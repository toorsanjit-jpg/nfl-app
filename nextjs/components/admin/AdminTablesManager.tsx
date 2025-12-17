"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminTable } from "@/types/admin";

type Props = {
  initial: AdminTable[];
};

const defaultTable: AdminTable = {
  table_key: "",
  title: "",
  description: "",
  is_enabled: true,
  default_sort_field: "",
  default_sort_dir: "desc",
};

export function AdminTablesManager({ initial }: Props) {
  const [tables, setTables] = useState<AdminTable[]>(initial);
  const [form, setForm] = useState<AdminTable>(defaultTable);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setTables(initial);
  }, [initial]);

  const handleChange = (key: keyof AdminTable, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setMessage(null);
    const res = await fetch("/api/admin/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json?._meta?.error || "Failed to save table");
      return;
    }
    if (json.saved) {
      const next = tables.filter((t) => t.table_key !== json.saved.table_key);
      setTables([json.saved as AdminTable, ...next]);
      setMessage("Saved.");
    }
  };

  const remove = async (tableKey: string) => {
    if (!confirm(`Delete table ${tableKey}?`)) return;
    setMessage(null);
    const res = await fetch(`/api/admin/tables/${tableKey}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.deleted) {
      setMessage(json?._meta?.error || "Failed to delete");
      return;
    }
    setTables(tables.filter((t) => t.table_key !== tableKey));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Table key</label>
          <input
            className="w-full rounded border px-2 py-1 text-sm"
            value={form.table_key}
            onChange={(e) => handleChange("table_key", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <input
            className="w-full rounded border px-2 py-1 text-sm"
            value={form.title}
            onChange={(e) => handleChange("title", e.target.value)}
          />
        </div>
        <div className="md:col-span-2 space-y-2">
          <label className="text-sm font-medium">Description</label>
          <textarea
            className="w-full rounded border px-2 py-1 text-sm"
            value={form.description || ""}
            onChange={(e) => handleChange("description", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Default sort field</label>
          <input
            className="w-full rounded border px-2 py-1 text-sm"
            value={form.default_sort_field || ""}
            onChange={(e) => handleChange("default_sort_field", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Default sort dir</label>
          <select
            className="w-full rounded border px-2 py-1 text-sm"
            value={form.default_sort_dir || ""}
            onChange={(e) => handleChange("default_sort_dir", e.target.value as any)}
          >
            <option value="">None</option>
            <option value="asc">asc</option>
            <option value="desc">desc</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_enabled}
            onChange={(e) => handleChange("is_enabled", e.target.checked)}
          />
          Enabled
        </label>
        <div className="md:col-span-2 flex items-center gap-2">
          <Button type="button" size="sm" onClick={save}>
            Save / Update
          </Button>
          {message ? <span className="text-xs text-muted-foreground">{message}</span> : null}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-muted">
              <th className="px-3 py-2 text-left">Key</th>
              <th className="px-3 py-2 text-left">Title</th>
              <th className="px-3 py-2 text-left">Enabled</th>
              <th className="px-3 py-2 text-left">Sort</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {tables.map((t) => (
              <tr key={t.table_key} className="border-t">
                <td className="px-3 py-2 font-mono">{t.table_key}</td>
                <td className="px-3 py-2">{t.title}</td>
                <td className="px-3 py-2">{t.is_enabled ? "Yes" : "No"}</td>
                <td className="px-3 py-2">
                  {t.default_sort_field
                    ? `${t.default_sort_field} (${t.default_sort_dir || "-"})`
                    : "-"}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setForm({ ...t });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(t.table_key)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
