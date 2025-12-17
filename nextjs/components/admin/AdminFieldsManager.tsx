"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AdminField } from "@/types/admin";

type Props = {
  initial: AdminField[];
};

const defaultField: AdminField = {
  field_name: "",
  label: "",
  category: "offense",
  data_type: "number",
  is_public: false,
  is_logged_in: false,
  is_premium: false,
  is_filterable: false,
  order_index: 0,
};

export function AdminFieldsManager({ initial }: Props) {
  const [fields, setFields] = useState<AdminField[]>(initial);
  const [form, setForm] = useState<AdminField>(defaultField);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setFields(initial);
  }, [initial]);

  const handleChange = (key: keyof AdminField, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setMessage(null);
    const res = await fetch("/api/admin/fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (!res.ok) {
      setMessage(json?._meta?.error || "Failed to save field");
      return;
    }
    if (json.saved) {
      const next = fields.filter((f) => f.field_name !== json.saved.field_name);
      setFields([json.saved as AdminField, ...next]);
      setMessage("Saved.");
    }
  };

  const remove = async (fieldName: string) => {
    if (!confirm(`Delete field ${fieldName}?`)) return;
    setMessage(null);
    const res = await fetch(`/api/admin/fields/${fieldName}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok || !json.deleted) {
      setMessage(json?._meta?.error || "Failed to delete");
      return;
    }
    setFields(fields.filter((f) => f.field_name !== fieldName));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Field name</label>
          <input
            className="w-full rounded border px-2 py-1 text-sm"
            value={form.field_name}
            onChange={(e) => handleChange("field_name", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Label</label>
          <input
            className="w-full rounded border px-2 py-1 text-sm"
            value={form.label}
            onChange={(e) => handleChange("label", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <select
            className="w-full rounded border px-2 py-1 text-sm"
            value={form.category}
            onChange={(e) => handleChange("category", e.target.value as any)}
          >
            <option value="offense">Offense</option>
            <option value="defense">Defense</option>
            <option value="special">Special</option>
            <option value="meta">Meta</option>
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Data type</label>
          <select
            className="w-full rounded border px-2 py-1 text-sm"
            value={form.data_type}
            onChange={(e) => handleChange("data_type", e.target.value as any)}
          >
            <option value="number">Number</option>
            <option value="text">Text</option>
            <option value="boolean">Boolean</option>
          </select>
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
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            { key: "is_public", label: "Public" },
            { key: "is_logged_in", label: "Logged-in" },
            { key: "is_premium", label: "Premium" },
            { key: "is_filterable", label: "Filterable" },
          ].map((flag) => (
            <label key={flag.key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={Boolean((form as any)[flag.key])}
                onChange={(e) => handleChange(flag.key as any, e.target.checked)}
              />
              {flag.label}
            </label>
          ))}
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
              <th className="px-3 py-2 text-left">Field</th>
              <th className="px-3 py-2 text-left">Label</th>
              <th className="px-3 py-2 text-left">Cat</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Order</th>
              <th className="px-3 py-2 text-left">Flags</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {fields.map((f) => (
              <tr key={f.field_name} className="border-t">
                <td className="px-3 py-2 font-mono">{f.field_name}</td>
                <td className="px-3 py-2">{f.label}</td>
                <td className="px-3 py-2">{f.category}</td>
                <td className="px-3 py-2">{f.data_type}</td>
                <td className="px-3 py-2">{f.order_index}</td>
                <td className="px-3 py-2">
                  {["is_public", "is_logged_in", "is_premium", "is_filterable"]
                    .filter((k) => (f as any)[k])
                    .join(", ")}
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setForm({ ...f });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(f.field_name)}
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
