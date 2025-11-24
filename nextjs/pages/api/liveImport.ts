import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: games } = await supabase
    .from("games")
    .select("*")
    .eq("status", "in")

  if (!games?.length) {
    return res.status(200).json({ ok: true, message: "no live games" })
  }

  let imported = 0

  for (const g of games) {
    const url = `https://site.api.espn.com/apis/site/v3/sports/football/nfl/summary?event=${g.game_id}`
    const resp = await fetch(url)
    const summary = await resp.json()

    const plays = summary.drives?.current?.plays ?? []

    for (const p of plays) {
      await supabase.from("plays").upsert({
        game_id: g.game_id,
        sequence: p.sequenceNumber,
        period: p.period.number,
        clock: p.clock.displayValue,
        description: p.text,
        yards: p.statYardage
      })

      imported++
    }
  }

  res.status(200).json({ ok: true, imported })
}
