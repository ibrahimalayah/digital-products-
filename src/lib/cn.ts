import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Client-safe (no Node imports).
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
