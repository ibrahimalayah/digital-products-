"use client";
import { Button } from "@/components/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="grid flex-1 place-items-center px-4 py-20 text-center">
      <div>
        <h1 className="font-display text-5xl">Something went wrong</h1>
        <p className="mt-3 text-muted">The page could not load. Nothing was lost.</p>
        <Button className="mt-8" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}
