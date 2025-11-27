// app/page.tsx
"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F7F7F7] text-[#0A0A0A]">
      
      {/* HERO SECTION */}
      <section className="w-full py-20 text-center border-b border-black/10 bg-white">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">
          NFL Analytics Engine
        </h1>
        <p className="text-lg text-black/60 max-w-2xl mx-auto mb-6">
          Real-time play-by-play intelligence + next-day enriched metrics.
        </p>

        <input
          placeholder="Search Game ID..."
          className="w-full max-w-lg py-3 px-4 rounded-xl bg-black/5 border border-black/20 outline-none"
        />

        <div className="flex items-center justify-center gap-4 mt-6">
          <Link href="/live" className="px-6 py-3 bg-blue-600 text-white rounded-lg">
            Live Games
          </Link>
          <Link href="/teams" className="px-6 py-3 bg-black/5 border border-black/10 rounded-lg">
            Teams
          </Link>
          <Link href="/players" className="px-6 py-3 bg-black/5 border border-black/10 rounded-lg">
            Players
          </Link>
        </div>
      </section>

      {/* LIVE GAMES SECTION */}
      <section className="py-12 px-6">
        <h2 className="text-2xl font-semibold mb-4">Live Games</h2>
        <p className="text-black/60 mb-6">
          Pulled automatically from ESPN API.
        </p>

        {/* Placeholder until we connect API */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="p-6 rounded-xl bg-white border border-black/10 shadow-sm"
            >
              <p className="text-black/60">Game #{n}</p>
              <p className="text-xl font-bold mt-2">Team A vs Team B</p>
              <p className="text-black/50">Q1 – 12:34</p>
            </div>
          ))}
        </div>
      </section>

      {/* ADVANCED METRICS */}
      <section className="py-12 px-6">
        <h2 className="text-2xl font-semibold mb-4">Advanced Metrics</h2>
        <p className="text-black/60 mb-6">
          Powered by enriched play-by-play + your algorithms.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            "Coverage Stats",
            "Blitz Rates",
            "Personnel Usage",
            "Route Heatmaps",
            "OL/DL Matchups",
            "What-If Engine",
          ].map((title) => (
            <div
              key={title}
              className="p-6 rounded-xl bg-white border border-black/10 shadow-sm hover:shadow-md transition cursor-pointer"
            >
              <p className="text-xl font-semibold">{title}</p>
              <p className="text-black/50 text-sm mt-2">Coming soon</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 text-center text-black/50 border-t border-black/10 mt-12">
        © {new Date().getFullYear()} NFL Analytics Engine — Built by Sanjit
      </footer>
    </main>
  );
}
