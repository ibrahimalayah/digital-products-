import Link from "next/link";
import { Logo } from "@/components/ui";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grain grid flex-1 place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex justify-center" aria-label="Kitforge home">
          <Logo />
        </Link>
        <div className="rounded-3xl border border-line bg-surface p-7 shadow-card">{children}</div>
      </div>
    </main>
  );
}
