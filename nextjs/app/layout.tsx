import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import Providers from "./providers";
import { createServerSupabase } from "@/lib/supabaseServer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NFL App",
  description: "NFL Data + Stats App",
};

// Force dynamic rendering so Supabase cookies/session access never triggers static-generation errors.
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createServerSupabase();
  const {
    data: { session: initialSession },
  } = supabase ? await supabase.auth.getSession() : { data: { session: null } };

  return (
    <html lang="en">
      <head>
        {/* Preline JS is required for dropdowns, tabs, modals, etc. */}
        <Script src="/preline.js" strategy="beforeInteractive" />
      </head>

      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers initialSession={initialSession}>{children}</Providers>
      </body>
    </html>
  );
}
