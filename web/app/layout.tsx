import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Weather-Boy — Vær for bønder",
  description:
    "Hyperlokal værkorreksjon med maskinlæring. Bedre enn Yr for din gård.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Weather-Boy",
  },
};

export const viewport: Viewport = {
  themeColor: "#fafaf9",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no" className={`${geist.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900 font-[family-name:var(--font-geist)]">
        <header className="border-b border-stone-200 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <a href="/" className="text-lg font-semibold tracking-tight">
              ⛅ Weather-Boy
            </a>
            <span className="text-sm text-stone-500">Vær for bønder</span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-stone-200 bg-white px-4 py-3 text-center text-xs text-stone-400">
          Data fra Yr og MET Frost · Korrigert med maskinlæring
        </footer>
      </body>
    </html>
  );
}
