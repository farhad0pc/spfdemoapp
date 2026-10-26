import type { Metadata } from "next";
import { Oswald } from "next/font/google";
import "./globals.css";

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin", "latin-ext"],
  weight: ["200", "300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Caesar Satınalma Defteri | Caesar Purchasing Ledger",
  description: "Afik Group Caesar Projects Construction Material Purchasing Sub-Ledger",
  icons: {
    icon: "https://res.cloudinary.com/iczztnnz/image/upload/v1793015175/CAESAR_EMBLEM_NO_TEXT.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${oswald.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-canvas-dark text-slate-100 dark:bg-canvas-dark dark:text-slate-100 selection:bg-amber-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
