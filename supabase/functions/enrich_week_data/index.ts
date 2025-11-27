import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { parse } from "https://deno.land/std@0.224.0/csv/parse.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const BUCKET = "nfl-enriched";

function normalizeHeader(header: string): string {
  return header
    .trim()
    .replace(/\uFEFF/g, "")        // Remove BOM
    .replace(/\s+/g, "_")          // Replace spaces with _
    .replace(/[^a-zA-Z0-9_]/g, "") // Remove illegal chars
    .toLowerCase();
}

async function getLatestCSV() {
  const { data, error } = await supabase
    .storage
    .from(BUCKET)
    .list("", { sortBy: { column: "updated_at", order: "desc" } });

  if (error) throw new Error(`List failed: ${error.message}`);

  const csv = data.find(f => f.name.toLowerCase().endsWith(".csv"));
  if (!csv) throw new Error("No CSV files found.");
  return csv.name;
}

async function downloadCSV(filename: string): Promise<string> {
  const { data, error } = await supabase
    .storage
    .from(BUCKET)
    .download(filename);

  if (error) throw new Error(`Download failed: ${error.message}`);

  return await data.text();
}

async function parseCSVSafe(csvText: string) {
  // Remove BOM + trim any empty trailing commas
  csvText = csvText.replace(/\uFEFF/g, "").trim();

  const parsed = await parse(csvText, {
    skipFirstRow: false,
    columns: (headers) => headers.map(normalizeHeader)
  });

  if (!parsed || parsed.length === 0) {
    throw new Error("CSV parsed but returned 0 rows — header issue likely.");
  }

  return parsed;
}

async function insertRows(rows: any[]) {
  if (rows.length === 0) return;

  const { error } = await supabase
    .from("nfl_enriched_raw")
    .insert(rows);

  if (error) throw new Error(`Insert failed: ${error.message}`);
}

Deno.serve(async () => {
  try {
    const filename = await getLatestCSV();
    console.log("Using file:", filename);

    const csvText = await downloadCSV(filename);
    const rows = await parseCSVSafe(csvText);

    console.log("Parsed rows:", rows.length);

    await insertRows(rows);

    const { error: mergeError } = await supabase.rpc("merge_enriched_from_raw");
    if (mergeError) throw new Error(`Merge failed: ${mergeError.message}`);

    return new Response(
      JSON.stringify({
        success: true,
        rows: rows.length,
        file: filename
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("ERROR:", err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
});
