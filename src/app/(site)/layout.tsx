import Link from "next/link";
import { LinkButton, Logo } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguagePicker } from "@/components/language-picker";
import { siteText } from "@/lib/locale";
import { currentLanguage } from "@/lib/locale-server";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const lang = await currentLanguage();
  const t = siteText(lang);
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/60 bg-bg/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 max-sm:gap-2 sm:px-6">
          <Link href="/" aria-label="Kitforge home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-0.5 text-sm" aria-label="Main">
            <Link href="/#how" className="hidden rounded-full px-3 py-2 text-muted transition-colors hover:text-ink md:block">
              {t.how}
            </Link>
            <Link href="/store" className="rounded-full px-3 py-2 text-muted transition-colors hover:text-ink max-sm:px-2">
              {t.store}
            </Link>
            <Link href="/pricing" className="rounded-full px-3 py-2 text-muted transition-colors hover:text-ink max-sm:px-2">
              {t.pricing}
            </Link>
            <Link href="/sign-in" className="hidden rounded-full px-3 py-2 text-muted transition-colors hover:text-ink sm:block">
              {t.signIn}
            </Link>
            <LanguagePicker value={lang} label={t.language} />
            <ThemeToggle className="mx-1 hidden sm:grid" />
            <LinkButton href="/app" size="sm">
              {t.openStudio}
            </LinkButton>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line bg-sunken/60">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo className="text-ink" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">The studio that researches, writes and promotes printable digital products.</p>
          </div>
          <nav aria-label="Product" className="text-sm">
            <p className="font-medium">Product</p>
            <ul className="mt-3 space-y-2 text-muted">
              <li>
                <Link href="/#how" className="hover:text-ink">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-ink">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/store" className="hover:text-ink">
                  Store
                </Link>
              </li>
            </ul>
          </nav>
          <nav aria-label="Account" className="text-sm">
            <p className="font-medium">Account</p>
            <ul className="mt-3 space-y-2 text-muted">
              <li>
                <Link href="/sign-up" className="hover:text-ink">
                  Create account
                </Link>
              </li>
              <li>
                <Link href="/sign-in" className="hover:text-ink">
                  Sign in
                </Link>
              </li>
              <li>
                <Link href="/app" className="hover:text-ink">
                  Open studio
                </Link>
              </li>
            </ul>
          </nav>
        </div>
        <div className="border-t border-line">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
            <p className="text-xs text-muted">
              Products are educational material, not professional advice.{" "}
              <Link href="/terms" className="underline hover:text-ink">
                Terms, rights and privacy
              </Link>
            </p>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </>
  );
}
