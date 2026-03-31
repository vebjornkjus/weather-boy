import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Weather-Boy — Vær for bønder",
  description:
    "Hyperlokal værkorreksjon med maskinlæring. Bedre enn Yr for din gård.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="no"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900">
        <header className="border-b border-stone-200 bg-white px-4 py-3">
          <div className="mx-auto flex max-w-4xl items-center justify-between">
            <a href="/" className="text-lg font-semibold tracking-tight">
              Weather-Boy
            </a>
            <span className="text-sm text-stone-500">
              Vær for bønder
            </span>
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">
          {children}
        </main>
        <footer className="border-t border-stone-200 bg-white px-4 py-3 text-center text-xs text-stone-400">
          Data fra Yr og MET Frost. Korrigert med maskinlæring.
        </footer>
      </body>
    </html>
  );
}
