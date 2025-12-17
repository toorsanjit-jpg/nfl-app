"use client";

import Link from "next/link";

type Props = {
  rows: Record<string, any>[];
  columns?: string[];
  title?: string;
  sortKey?: string;
  category?: string;
};

export default function HomeTable({ rows, columns = [], title, sortKey }: Props) {
  // Backward-compatible fallback for older hardcoded tables
  if (!columns.length) {
    const key = sortKey || "total_yards";
    const sorted = [...rows].sort((a, b) => Number(b?.[key] ?? 0) - Number(a?.[key] ?? 0));
    return (
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-2 text-left">Team</th>
              <th className="p-2 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, idx) => (
              <tr key={idx} className="border-t">
                <td className="p-2">{row.team_name ?? row.team_id ?? "-"}</td>
                <td className="p-2 text-right">{formatCell(row[key])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            {columns.map((col) => (
              <th key={col} className="p-2 text-left">
                {col}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="p-3 text-center text-muted-foreground">
                No data.
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={idx} className="border-t">
                {columns.map((col) => (
                  <td key={col} className="p-2">
                    {formatCell(row[col])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value: any) {
  if (value == null) return "";
  if (typeof value === "number") return Number(value).toLocaleString();
  return String(value);
}
