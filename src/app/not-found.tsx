import { LinkButton, Logo } from "@/components/ui";

export default function NotFound() {
  return (
    <main className="grain grid flex-1 place-items-center px-4 py-20 text-center">
      <div>
        <Logo className="justify-center" />
        <h1 className="mt-8 font-display text-6xl">Page not found</h1>
        <p className="mt-3 text-muted">That page does not exist, or you do not have access to it.</p>
        <div className="mt-8 flex justify-center gap-3">
          <LinkButton href="/">Home</LinkButton>
          <LinkButton href="/store" variant="secondary">
            Store
          </LinkButton>
        </div>
      </div>
    </main>
  );
}
