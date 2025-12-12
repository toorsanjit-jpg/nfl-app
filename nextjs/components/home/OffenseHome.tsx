"use client";

import { useEffect, useState } from "react";
import SeasonFilter from "./SeasonFilter";
import SortControl from "./SortControl";
import HomeTable from "./HomeTable";

type Row = Record<string, any>;

export default function OffenseHome() {
  const [rows, setRows] = useState<Row[]>([]);
  const [season, setSeason] = useState("2024");
  const [sortKey, setSortKey] = useState("total_yards");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/home/offense");
      const json = await res.json();
      setRows((json.rows as Row[]) || []);
    }
    load();
  }, []);

  // Note: season filtering not yet wired to API; this is placeholder UI.
  return (
    <div className="space-y-4">
      <SeasonFilter value={season} onChange={setSeason} />
      <SortControl value={sortKey} onChange={setSortKey} />
      <HomeTable rows={rows} sortKey={sortKey} />
    </div>
  );
}
