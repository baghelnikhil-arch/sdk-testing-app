import type { Metadata } from "next";
import { Inter, Instrument_Serif } from "next/font/google";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Providers } from "./providers";
import { SITE } from "@/lib/constants";
import { getCategories } from "@/lib/shop-data";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const display = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Fetched once here and handed to the header and footer, so the catalogue
  // never has to be bundled into the browser just to render navigation.
  const [categories, user] = await Promise.all([
    getCategories(),
    getCurrentUser(),
  ]);

  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="flex min-h-screen flex-col">
        <Providers
          user={
            user && {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            }
          }
        >
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-70 focus:rounded-md focus:bg-foreground focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background"
          >
            Skip to content
          </a>

          <Navbar categories={categories} user={user} />

          <main id="main" className="flex-1">
            {children}
          </main>

          <Footer categories={categories} isAdmin={user?.role === "admin"} />
        </Providers>
      </body>
    </html>
  );
}
