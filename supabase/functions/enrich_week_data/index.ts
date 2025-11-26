import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { parse } from "https://deno.land/std@0.224.0/csv/parse.ts";

// Get environment variables from Edge Function secrets
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

// Storage bucket + folder
const BUCKET = "nfl-enriched";
const FOLDER = "Week 1-11";

async function downloadCSV(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(`${FOLDER}/${path}`);

  if (error) throw new Error(`Download failed: ${error.message}`);
  return await data.text();
}

async function insertIntoStaging(rows: any[]) {
  if (rows.length === 0) return;

  const { error } = await supabase
    .from("nfl_enriched_raw")
    .insert(rows);

  if (error)
    throw new Error(`Failed to insert into nfl_enriched_raw: ${error.message}`);
}

async function parseCSV(text: string): Promise<any[]> {
  return await parse(text, {
    skipFirstRow: false,
    columns: true
  });
}

Deno.serve(async () => {
  try {
    console.log("Starting enrichment function…");

    // Download CSVs
    const passCSV = await downloadCSV("Play Summary Pass Week 1 - 11.csv");
    const rushCSV = await downloadCSV("Play Summary Rush Week 1 - 11.csv");

    // Parse CSVs
    const passRows = await parseCSV(passCSV);
    const rushRows = await parseCSV(rushCSV);

    console.log(
      `Parsed ${passRows.length} pass rows, ${rushRows.length} rush rows`
    );

    // Insert into staging
    await insertIntoStaging(passRows);
    await insertIntoStaging(rushRows);

    console.log("Inserted data into nfl_enriched_raw");

    // Merge into nfl_plays using SQL function
    const { error: fnError } = await supabase.rpc("merge_enriched_from_raw");

    if (fnError)
      throw new Error(`Merge function failed: ${fnError.message}`);

    console.log("Merge successful.");

    return new Response(
      JSON.stringify({
        success: true,
        pass_rows: passRows.length,
        rush_rows: rushRows.length,
        message: "Enriched data merged into nfl_plays"
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Error:", err.message);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500 }
    );
  }
});
