import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const response = await fetch("https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard")
  const data = await response.json()

  // Store entire schedule
  await supabase.from("games").upsert(
    data.events.map((g: any) => ({
      game_id: g.id,
      home_team: g.competitions[0].competitors.find((c: any) => c.homeAway === "home")?.id,
      away_team: g.competitions[0].competitors.find((c: any) => c.homeAway === "away")?.id,
      start_time: g.date,
      status: g.status.type.name
    }))
  )

  return res.status(200).json({ ok: true })
}
