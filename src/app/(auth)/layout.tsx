import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { Logo } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";
import { BRAND } from "@/lib/brand.generated";

const points = ["Research an idea in about 20 seconds", "Generate every page, ready to print", "Daily posts on the budget you set"];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid flex-1 lg:grid-cols-[1fr_1.05fr]">
      <div className="flex min-h-screen flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Kitforge home">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="grid flex-1 place-items-center py-10">
          <div className="rise w-full max-w-sm">{children}</div>
        </div>
        <p className="text-xs text-muted">Free plan. No card needed.</p>
      </div>

      <aside className="relative hidden overflow-hidden bg-accent text-on-accent lg:block" aria-hidden={BRAND.auth ? undefined : true}>
        {BRAND.auth ? (
          <Image src={BRAND.auth} alt="Printed worksheets and a green booklet on a desk" fill priority sizes="50vw" className="object-cover" />
        ) : (
          <>
            <div className="grain absolute inset-0 opacity-30" />
            <div className="absolute -right-16 top-24 h-[420px] w-[320px] rotate-6 rounded-2xl bg-on-accent/95 p-7 text-ink shadow-lift">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-accent">Week 1 · Day 2</p>
              <p className="mt-2 font-display text-3xl leading-tight">Set the routine</p>
              <div className="mt-6 space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="size-3.5 rounded-[4px] border border-ink" />
                    <span className="h-1.5 flex-1 rounded bg-line" />
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -right-6 top-[330px] h-[300px] w-[240px] -rotate-3 rounded-2xl bg-ink p-6 shadow-lift">
              <p className="font-display text-2xl leading-tight text-bg">Puppy Potty Plan</p>
            </div>
          </>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-10 pt-32 text-white">
          <p className="max-w-sm font-display text-4xl leading-[1.05]">One idea in. A finished product out.</p>
          <ul className="mt-5 space-y-2 text-sm">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-2">
                <Check className="size-4" aria-hidden /> {p}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  );
}
