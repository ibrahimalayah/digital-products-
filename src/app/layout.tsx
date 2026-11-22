import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { BRAND } from "@/lib/brand.generated";
import { currentLanguage } from "@/lib/locale-server";
import { appUrl } from "@/lib/env";
import { SITE_KEYWORDS } from "@/lib/seo";
import { isRtl } from "@/lib/languages";
import { dictFor } from "@/i18n";
import { I18nProvider } from "@/components/i18n";
import { getT } from "@/lib/i18n-server";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Instrument_Serif({ variable: "--font-display", subsets: ["latin"], weight: "400", style: ["normal", "italic"] });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    metadataBase: new URL(appUrl()),
    keywords: SITE_KEYWORDS,
    applicationName: "Kitforge",
    robots: { index: true, follow: true },
    // Set GOOGLE_SITE_VERIFICATION to the code Google Search Console gives you.
    ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
    title: { default: t("Kitforge: AI studio for digital products"), template: "%s · Kitforge" },
    description: t("Research an idea, generate a print-ready digital product, and run daily social campaigns on a budget you choose."),
    openGraph: { title: "Kitforge", description: t("From one idea to a product that sells itself daily."), type: "website", ...(BRAND.store ? { images: [BRAND.store] } : {}) },
  };
}

const themeScript = `try{var t=localStorage.getItem("kitforge-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the nonce also makes every page render per request, which nonces require.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const lang = await currentLanguage();
  return (
    <html lang={lang} dir={isRtl(lang) ? "rtl" : "ltr"} suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}>
      <head>
        {/* Applies a saved theme before first paint so the page never flashes. */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <I18nProvider lang={lang} dict={dictFor(lang)}>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
