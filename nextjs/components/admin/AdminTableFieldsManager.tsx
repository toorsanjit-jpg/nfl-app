"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminTableField } from "@/types/admin";

type Props = {
  initial: AdminTableField[];
};

const defaultLink: AdminTableField = {
  table_key: "",
  field_name: "",
  order_index: 0,
  is_visible: true,
};

export function AdminTableFieldsManager({ initial }: Props) {
  const [items, setItems] = useState<AdminTableField[]>(initial);
  const [form, setForm] = useState<AdminTableField>(defaultLink);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const handleChange = (key: keyof AdminTableField, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setMessage(null);
    const res = await fetch("/api/admin/tableFields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json?._meta?.error || "Failed to save link");
      return;
    }
    if (json.saved) {
      const next = items.filter(
        (i) =>
          !(i.table_key === json.saved.table_key && i.field_name === json.saved.field_name)
      );
      setItems([json.saved as AdminTableField, ...next]);
      setMessage("Saved.");
    }
  };

  const remove = async (tableKey: string, fieldName: string) => {
    if (!confirm(`Delete mapping ${tableKey}.${fieldName}?`)) return;
    setMessage(null);
    const res = await fetch(
      `/api/admin/tableFields/${tableKey}/${fieldName}`,
      { method: "DELETE" }
    );
    const json = await res.json();
    if (!res.ok || !json.deleted) {
      setMessage(json?._meta?.error || "Failed to delete");
      return;
    }
    setItems(
      items.filter((i) => !(i.table_key === tableKey && i.field_name === fieldName))
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Table key</label>
          <input
            className="w-full rounded border px-2 py-1 text-sm"
            value={form.table_key}
            onChange={(e) => handleChange("table_key", e.target.value)}
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
          <label className="text-sm font-medium">Order index</label>
          <input
            type="number"
            className="w-full rounded border px-2 py-1 text-sm"
            value={form.order_index}
            onChange={(e) => handleChange("order_index", Number(e.target.value))}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_visible}
            onChange={(e) => handleChange("is_visible", e.target.checked)}
          />
          Visible
        </label>
        <div className="md:col-span-3 flex items-center gap-2">
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
              <th className="px-3 py-2 text-left">Table</th>
              <th className="px-3 py-2 text-left">Field</th>
              <th className="px-3 py-2 text-left">Order</th>
              <th className="px-3 py-2 text-left">Visible</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={`${i.table_key}-${i.field_name}`} className="border-t">
                <td className="px-3 py-2 font-mono">{i.table_key}</td>
                <td className="px-3 py-2 font-mono">{i.field_name}</td>
                <td className="px-3 py-2">{i.order_index}</td>
                <td className="px-3 py-2">{i.is_visible ? "Yes" : "No"}</td>
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
                    onClick={() => remove(i.table_key, i.field_name)}
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
