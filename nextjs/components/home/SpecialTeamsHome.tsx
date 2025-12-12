"use client";

import { useEffect, useState } from "react";
import STCategorySelect from "./STCategorySelect";
import HomeTable from "./HomeTable";

type Row = Record<string, any>;

export default function SpecialTeamsHome() {
  const [rows, setRows] = useState<Row[]>([]);
  const [category, setCategory] = useState("all");

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/home/st");
      const json = await res.json();
      setRows((json.rows as Row[]) || []);
    }
    load();
  }, []);

  return (
    <div className="space-y-4">
      <STCategorySelect value={category} onChange={setCategory} />
      <HomeTable rows={rows} category={category} />
    </div>
  );
}
