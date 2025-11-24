// supabase/functions/import_finished_games/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";



// For now this is just a simple OK placeholder.

// We'll plug in the real "import finished games" logic later.



serve(async () => {

  return new Response(

    JSON.stringify({ status: "ok", imported: 0 }),

    { headers: { "Content-Type": "application/json" } },

  );

});
