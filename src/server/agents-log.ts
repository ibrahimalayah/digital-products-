import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { newId } from "@/lib/utils";

export type AgentName = "idea-scout" | "product-writer" | "ad-planner" | "daily-poster" | "publisher";

export async function logRun(userId: string, agent: AgentName, status: "ok" | "error" | "skipped", summary: string) {
  await db.insert(schema.agentRuns).values({ id: newId("run"), userId, agent, status, summary: summary.slice(0, 400) });
}

export function listRuns(userId: string, limit = 40) {
  return db.select().from(schema.agentRuns).where(eq(schema.agentRuns.userId, userId)).orderBy(desc(schema.agentRuns.createdAt)).limit(limit);
}
