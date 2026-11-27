import type { Metadata, Viewport } from "next";
import { Oswald } from "next/font/google";
import "./globals.css";
import GlobalUtilityFab from "@/components/GlobalUtilityFab";
import SplashOverlay from "@/components/SplashOverlay";

const oswald = Oswald({
  variable: "--font-oswald",
  subsets: ["latin", "latin-ext"],
  weight: ["200", "300", "400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "CAESAR CENTRAL HUB — Internal Operations Portal",
  description: "CAESAR CENTRAL HUB — Afik Group Caesar Projects Internal Operations Portal",
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
      <body className="min-h-full w-full max-w-full overflow-x-hidden flex flex-col bg-canvas-dark text-slate-100 dark:bg-canvas-dark dark:text-slate-100 selection:bg-amber-500 selection:text-slate-950">
        <SplashOverlay />
        {children}
        <GlobalUtilityFab />
      </body>
    </html>
  );
}
