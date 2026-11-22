// Deterministic stand-ins for the AI layer, used only by automated tests
// (AI_MOCK=1 outside production). Not part of the product.
// Shapes mirror what the real models return, before normalising.
import type { BudgetPlan, ProductOutline, ProductSection } from "./types";

export function ideas(niche: string) {
  return [1, 2, 3].map((n) => ({
    title: `${niche} Starter Kit ${n}`,
    promise: `Finish your first ${niche} project in a weekend.`,
    audience: `Beginners starting ${niche}`,
    format: "3 templates, a checklist and a tracker",
    proof: `People search for quick starts. Check "${niche} template" and "${niche} checklist".`,
    suggestedPriceUsd: 9 + n,
  }));
}

export function outline(title: string): ProductOutline {
  return {
    subtitle: `Your shortcut to ${title}`,
    welcome: "This kit is for you if you want a result without the guesswork.\n\nBy the last page you will have a finished plan.",
    howToUse: ["Print the pages.", "Work one page a day.", "Tick each box as you go."],
    sections: [
      { title: "Get ready", summary: "Set up what you need.", pageTitles: ["Know your starting point", "Gather your tools"] },
      { title: "Do the work", summary: "Follow the core steps.", pageTitles: ["The first step", "The second step"] },
    ],
    extras: ["Progress tracker", "Final checklist"],
  };
}

export function section(target: { title: string; summary: string; pageTitles: string[] }): ProductSection {
  return {
    title: target.title,
    summary: target.summary,
    pages: target.pageTitles.map((heading) => ({
      heading,
      goal: `Complete "${heading}".`,
      blocks: [
        { type: "paragraph", title: "", text: "Start here. This page walks you through one small win.", items: [] },
        { type: "steps", title: "Do this", text: "", items: ["Read the page.", "Do the task.", "Tick the box."] },
        { type: "tip", title: "", text: "Set a ten minute timer.", items: [] },
      ],
    })),
  };
}

export function video(title: string) {
  return {
    title: `${title} in 15 seconds`,
    scenes: [
      { caption: "Still stuck at step one?", narration: "Still stuck at step one?" },
      { caption: "Here is the shortcut", narration: `${title} gives you the exact steps.` },
      { caption: "Get it today", narration: "Get it today from the link." },
    ],
    description: `The shortcut for ${title}.`,
    hashtags: ["digitalproducts", "#printables"],
  };
}

export function plan(channels: string[]): BudgetPlan {
  return {
    summary: "Focus on the channels you already have. Post daily and review weekly.",
    allocations: channels.map((channel) => ({ channel, percent: Math.floor(100 / channels.length), rationale: "Good fit for this audience." })),
    cadence: "Post every morning. Spend evenly through the month.",
    angles: ["Problem", "Outcome", "Inside the kit", "Objection", "Quick tip"],
    kpis: ["Link clicks", "Sales", "Cost per sale"],
  };
}

export function posts(slots: string[], title: string, url: string) {
  return slots.map((channel, i) => ({
    channel,
    angle: ["Problem", "Outcome", "Inside the kit"][i % 3],
    content: `Stuck getting started? ${title} gives you the exact steps. ${url} #digitalproducts`,
  }));
}
