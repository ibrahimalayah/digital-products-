export type BlockType = "paragraph" | "steps" | "checklist" | "tip" | "stuck" | "template" | "fill";

/** One printable building block. `items` is used by steps/checklist/fill; `text` by the rest. */
export type Block = { type: BlockType; title: string; text: string; items: string[] };

export type ProductPage = { heading: string; goal: string; blocks: Block[] };

export type ProductSection = { title: string; summary: string; pages: ProductPage[] };

export type ProductOutline = {
  subtitle: string;
  welcome: string;
  howToUse: string[];
  sections: { title: string; summary: string; pageTitles: string[] }[];
  extras: string[];
};

export type CampaignChannel = { integrationId: string | null; identifier: string; name: string };

export type BudgetPlan = {
  summary: string;
  allocations: { channel: string; percent: number; rationale: string }[];
  cadence: string;
  angles: string[];
  kpis: string[];
};

/** One beat of a short vertical video: what is said and what is shown on screen. */
export type VideoScene = { caption: string; narration: string };

export type VideoScript = {
  scenes: VideoScene[];
  /** Ready-to-paste post text for TikTok, Reels or Shorts. */
  description: string;
  hashtags: string[];
};

export type PlanId ="free" | "pro" | "business";
