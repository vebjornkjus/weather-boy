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
  themeColor: "#dce8f5",
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
      <body className="sky-gradient min-h-full flex flex-col text-slate-800">
        <header className="relative z-10 px-5 pt-5 pb-3">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <a href="/" className="group flex items-center gap-2">
              <span className="text-2xl drop-shadow-sm">⛅</span>
              <span className="font-[family-name:var(--font-display)] text-xl font-normal tracking-tight text-slate-700 group-hover:text-slate-900 transition-colors">
                Weather-Boy
              </span>
            </a>
            <span className="text-xs tracking-widest uppercase text-slate-400 font-medium">
              Vær for bønder
            </span>
          </div>
        </header>

        <main className="relative z-10 mx-auto w-full max-w-3xl flex-1 px-5 py-4">
          {children}
        </main>

        <footer className="relative z-10 px-5 pb-5 pt-8 text-center">
          <p className="text-[11px] tracking-wide text-slate-400/70">
            Data fra Yr & MET Frost · Korrigert med maskinlæring
          </p>
        </footer>
      </body>
    </html>
  );
}
