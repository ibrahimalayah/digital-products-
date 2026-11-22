import Link from "next/link";
import { LinkButton, Logo } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguagePicker } from "@/components/language-picker";
import { siteText } from "@/lib/locale";
import { currentLanguage } from "@/lib/locale-server";
import { getT } from "@/lib/i18n-server";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const lang = await currentLanguage();
  const site = siteText(lang);
  const t = await getT();
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 max-sm:gap-2 sm:px-6">
          <Link href="/" aria-label={t("Kitforge home")}>
            <Logo />
          </Link>
          <nav className="flex items-center gap-0.5 text-sm" aria-label={t("Main")}>
            <Link href="/#how" className="hidden rounded-full px-3 py-2 text-muted transition-colors hover:text-ink md:block">
              {site.how}
            </Link>
            <Link href="/store" className="rounded-full px-3 py-2 text-muted transition-colors hover:text-ink max-sm:px-2">
              {site.store}
            </Link>
            <Link href="/pricing" className="rounded-full px-3 py-2 text-muted transition-colors hover:text-ink max-sm:px-2">
              {site.pricing}
            </Link>
            <Link href="/sign-in" className="hidden rounded-full px-3 py-2 text-muted transition-colors hover:text-ink sm:block">
              {site.signIn}
            </Link>
            <LanguagePicker value={lang} label={site.language} />
            <ThemeToggle className="mx-1 hidden sm:grid" />
            <LinkButton href="/app" size="sm">
              {site.openStudio}
            </LinkButton>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line bg-sunken/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo className="text-ink" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{t("The studio that researches, writes and promotes printable digital products.")}</p>
          </div>
          <nav aria-label={t("Product")} className="text-sm">
            <p className="font-medium">{t("Product")}</p>
            <ul className="mt-3 space-y-2 text-muted">
              <li>
                <Link href="/#how" className="hover:text-ink">
                  {t("How it works")}
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-ink">
                  {t("Pricing")}
                </Link>
              </li>
              <li>
                <Link href="/store" className="hover:text-ink">
                  {t("Store")}
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label={t("Account")} className="text-sm">
            <p className="font-medium">{t("Account")}</p>
            <ul className="mt-3 space-y-2 text-muted">
              <li>
                <Link href="/sign-up" className="hover:text-ink">
                  {t("Create account")}
                </Link>
              </li>
              <li>
                <Link href="/sign-in" className="hover:text-ink">
                  {t("Sign in")}
                </Link>
              </li>
              <li>
                <Link href="/app" className="hover:text-ink">
                  {t("Open studio")}
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-line">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <p className="text-xs text-muted">
              {t("Products are educational material, not professional advice.")}{" "}
              <Link href="/terms" className="underline hover:text-ink">
                {t("Terms, rights and privacy")}
              </Link>
            </p>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </>
  );
}
