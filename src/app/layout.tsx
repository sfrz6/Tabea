import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Inter } from "next/font/google";
import "./globals.css";
import { directionOf } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { getDictionary } from "@/lib/i18n/translate";

/**
 * Two faces, one stack. Arabic text falls through to IBM Plex Sans Arabic
 * because Inter carries no Arabic glyphs, which keeps mixed text consistent
 * without any per element font switching.
 */
const latin = Inter({
  subsets: ["latin"],
  variable: "--font-latin",
  display: "swap",
});

const arabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Tabea",
    template: "%s · Tabea",
  },
  description:
    "Tabea is a private task accountability system: assign work clearly, follow its progress and keep its history.",
  applicationName: "Tabea",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Tabea",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Zoom stays available. Safari zoom on focus is prevented by the 16px font
  // floor in globals.css, not by taking pinch to zoom away from the user.
  maximumScale: 5,
  // Lets the page paint into the notch and Dynamic Island area, which the
  // safe-area utilities then account for.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1113" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const dict = getDictionary(locale);

  return (
    <html
      lang={locale}
      dir={directionOf(locale)}
      className={`${latin.variable} ${arabic.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-canvas antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:m-3 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink focus:shadow-raised"
        >
          {dict.nav.skipToContent}
        </a>
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
