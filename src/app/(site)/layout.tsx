import Link from "next/link";
import { LinkButton, Logo } from "@/components/ui";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label="Kitforge home">
            <Logo />
          </Link>
          <nav className="flex items-center gap-1 text-sm" aria-label="Main">
            <Link href="/store" className="rounded-full px-3 py-2 text-muted hover:text-ink">
              Store
            </Link>
            <Link href="/pricing" className="rounded-full px-3 py-2 text-muted hover:text-ink">
              Pricing
            </Link>
            <Link href="/sign-in" className="hidden rounded-full px-3 py-2 text-muted hover:text-ink sm:block">
              Sign in
            </Link>
            <LinkButton href="/app" size="sm" className="ml-1">
              Open studio
            </LinkButton>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:px-6">
          <Logo className="text-lg text-ink" />
          <p>Products are educational material, not professional advice.</p>
          <div className="flex gap-4">
            <Link href="/store" className="hover:text-ink">
              Store
            </Link>
            <Link href="/pricing" className="hover:text-ink">
              Pricing
            </Link>
            <Link href="/sign-up" className="hover:text-ink">
              Create account
            </Link>
          </div>
        </div>
      </footer>
    </>
  );
}
