import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { parse } from "https://deno.land/std@0.224.0/csv/parse.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const BUCKET = "nfl-enriched";

async function getLatestCSV() {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list("", { sortBy: { column: "updated_at", order: "desc" } });

  if (error) throw new Error(`List failed: ${error.message}`);

  const file = data.find(f => f.name.toLowerCase().endsWith(".csv"));
  if (!file) throw new Error("No CSV files found.");

  return file.name;
}

async function downloadCSV(filename: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(filename);

  if (error) throw new Error(`Download failed: ${error.message}`);
  return await data.text();
}

async function parseCSV(text: string): Promise<any[]> {
  return await parse(text, { skipFirstRow: false, columns: true });
}

async function insertRows(rows: any[]) {
  if (rows.length === 0) return;
  const { error } = await supabase.from("nfl_enriched_raw").insert(rows);
  if (error) throw new Error(`Insert failed: ${error.message}`);
}

Deno.serve(async () => {
  try {
    const filename = await getLatestCSV();
    const csvText = await downloadCSV(filename);
    const rows = await parseCSV(csvText);

    await insertRows(rows);
    await supabase.rpc("merge_enriched_from_raw");

    return new Response(
      JSON.stringify({
        success: true,
        rows: rows.length,
        file_used: filename
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
});
