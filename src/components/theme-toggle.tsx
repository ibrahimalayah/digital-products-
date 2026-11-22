"use client";
import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import { useT } from "./i18n";

type Theme = "light" | "dark";
const listeners = new Set<() => void>();

function current(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", fn);
  return () => {
    listeners.delete(fn);
    mq.removeEventListener("change", fn);
  };
}

export function ThemeToggle({ className }: { className?: string }) {
  // The server cannot know the theme, so it renders the light icon and the client corrects it.
  const theme = useSyncExternalStore<Theme>(subscribe, current, () => "light");
  const next: Theme = theme === "dark" ? "light" : "dark";
  const t = useT();
  const label = t(next === "dark" ? "Switch to dark theme" : "Switch to light theme");

  function toggle() {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("kitforge-theme", next);
    } catch {
      // Private browsing: the choice lasts for this page only.
    }
    listeners.forEach((fn) => fn());
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={cn("grid size-9 place-items-center rounded-full text-muted transition-colors hover:bg-sunken hover:text-ink", className)}
    >
      {theme === "dark" ? <Sun className="size-[18px]" aria-hidden /> : <Moon className="size-[18px]" aria-hidden />}
    </button>
  );
}
