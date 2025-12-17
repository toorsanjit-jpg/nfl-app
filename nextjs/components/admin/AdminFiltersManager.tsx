"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminFilter } from "@/types/admin";

type Props = {
  initial: AdminFilter[];
};

const defaultFilter: AdminFilter = {
  filter_key: "",
  field_name: "",
  operator: "=",
  ui_type: "toggle",
  is_public: false,
  is_premium: false,
};

export function AdminFiltersManager({ initial }: Props) {
  const [items, setItems] = useState<AdminFilter[]>(initial);
  const [form, setForm] = useState<AdminFilter>(defaultFilter);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const handleChange = (key: keyof AdminFilter, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setMessage(null);
    const res = await fetch("/api/admin/filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json?._meta?.error || "Failed to save filter");
      return;
    }
    if (json.saved) {
      const next = items.filter((i) => i.filter_key !== json.saved.filter_key);
      setItems([json.saved as AdminFilter, ...next]);
      setMessage("Saved.");
    }
  };

  const remove = async (key: string) => {
    if (!confirm(`Delete filter ${key}?`)) return;
    setMessage(null);
    const res = await fetch(`/api/admin/filters/${key}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.deleted) {
      setMessage(json?._meta?.error || "Failed to delete");
      return;
    }
    setItems(items.filter((i) => i.filter_key !== key));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Filter key</label>
          <input
            className="w-full rounded border px-2 py-1 text-sm"
            value={form.filter_key}
            onChange={(e) => handleChange("filter_key", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Field name</label>
          <input
            className="w-full rounded border px-2 py-1 text-sm"
            value={form.field_name}
            onChange={(e) => handleChange("field_name", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Operator</label>
          <select
            className="w-full rounded border px-2 py-1 text-sm"
            value={form.operator}
            onChange={(e) => handleChange("operator", e.target.value as any)}
          >
            {["=","!=","<",">","<=",">=","between","in"].map((op) => (
              <option key={op} value={op}>{op}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">UI type</label>
          <select
            className="w-full rounded border px-2 py-1 text-sm"
            value={form.ui_type}
            onChange={(e) => handleChange("ui_type", e.target.value as any)}
          >
            <option value="toggle">Toggle</option>
            <option value="dropdown">Dropdown</option>
            <option value="multiselect">Multiselect</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_public}
              onChange={(e) => handleChange("is_public", e.target.checked)}
            />
            Public
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_premium}
              onChange={(e) => handleChange("is_premium", e.target.checked)}
            />
            Premium
          </label>
        </div>
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
              <th className="px-3 py-2 text-left">Field</th>
              <th className="px-3 py-2 text-left">Op</th>
              <th className="px-3 py-2 text-left">UI</th>
              <th className="px-3 py-2 text-left">Flags</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.filter_key} className="border-t">
                <td className="px-3 py-2 font-mono">{i.filter_key}</td>
                <td className="px-3 py-2 font-mono">{i.field_name}</td>
                <td className="px-3 py-2">{i.operator}</td>
                <td className="px-3 py-2">{i.ui_type}</td>
                <td className="px-3 py-2">
                  {["is_public", "is_premium"].filter((k) => (i as any)[k]).join(", ")}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setForm({ ...i });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(i.filter_key)}
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
