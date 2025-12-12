"use client";

import Link from "next/link";

type Props = {
  rows: Record<string, any>[];
  sortKey?: string;
  category?: string;
};

export default function HomeTable({ rows, sortKey = "total_yards" }: Props) {
  const sorted = [...rows].sort((a, b) => {
    const x = a?.[sortKey] ?? 0;
    const y = b?.[sortKey] ?? 0;
    return Number(y) - Number(x);
  });

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Team</th>
            <th className="p-2 text-right">Yards</th>
            <th className="p-2 text-right">Plays</th>
            <th className="p-2 text-right">Yds/Play</th>
          </tr>
        </thead>

        <tbody>
          {sorted.map((row) => (
            <tr key={row.team_id} className="border-t">
              <td className="p-2">
                <Link
                  href={`/teams/${row.team_id}`}
                  className="text-blue-600 hover:underline"
                >
                  {row.team_name ?? row.team_id}
                </Link>
              </td>
              <td className="p-2 text-right">{row.total_yards ?? 0}</td>
              <td className="p-2 text-right">{row.plays ?? 0}</td>
              <td className="p-2 text-right">
                {row.yards_per_play != null
                  ? Number(row.yards_per_play).toFixed(2)
                  : "0.00"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
