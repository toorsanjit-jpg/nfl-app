import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { parse } from "https://deno.land/std@0.224.0/csv/parse.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const BUCKET = "nfl-enriched";

// Get the newest CSV file in the bucket
async function getLatestCSVPath() {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .list("", { sortBy: { column: "updated_at", order: "desc" } });

  if (error) throw new Error(`List failed: ${error.message}`);

  const csv = data.find(f => f.name.toLowerCase().endsWith(".csv"));
  if (!csv) throw new Error("No CSV files found in bucket root.");

  return csv.name; // filename only, no folder
}

async function downloadCSV(filename: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(filename);

  if (error) throw new Error(`Download failed for ${filename}: ${error.message}`);
  return await data.text();
}

async function insertIntoStaging(rows: any[]) {
  if (rows.length === 0) return;

  const { error } = await supabase
    .from("nfl_enriched_raw")
    .insert(rows);

  if (error)
    throw new Error(`Failed inserting into nfl_enriched_raw: ${error.message}`);
}

async function parseCSV(text: string): Promise<any[]> {
  return await parse(text, {
    skipFirstRow: false,
    columns: true
  });
}

Deno.serve(async () => {
  try {
    console.log("Starting enrichment...");

    // STEP 1 — find latest CSV
    const filename = await getLatestCSVPath();
    console.log("Using CSV:", filename);

    // STEP 2 — download it
    const csvText = await downloadCSV(filename);

    // STEP 3 — parse it
    const rows = await parseCSV(csvText);
    console.log(`Parsed ${rows.length} rows`);

    // STEP 4 — insert into raw staging
    await insertIntoStaging(rows);

    // STEP 5 — merge into nfl_plays
    const { error: fnError } = await supabase.rpc("merge_enriched_from_raw");
    if (fnError) throw new Error(`Merge failed: ${fnError.message}`);

    return new Response(
      JSON.stringify({
        success: true,
        rows: rows.length,
        file_used: filename,
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error(err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
});
