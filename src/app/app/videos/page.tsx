import type { Metadata } from "next";
import Link from "next/link";
import { requireUserPage } from "@/lib/session";
import { getPlan } from "@/lib/plans";
import { getUsage } from "@/lib/usage";
import { listProducts } from "@/server/products";
import { listVideos } from "@/server/videos";
import { Card, Empty, LinkButton, PageHeader } from "@/components/ui";
import { VideoForm } from "@/components/studio/video-form";
import { dateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Lead videos" };

export default async function Videos({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const user = await requireUserPage("/app/videos");
  const [{ product }, products, rows, usage] = await Promise.all([searchParams, listProducts(user.id), listVideos(user.id), getUsage(user.id)]);
  const remaining = Math.max(0, getPlan(user.plan).limits.videosPerMonth - usage.videos);
  return (
    <>
      <PageHeader
        eyebrow="Lead videos"
        title="Short videos that send people to your product"
        description="Pick a product and the video writer scripts a 15 to 45 second vertical video. Add your presenter, choose a voice and download a file ready for TikTok, Reels and Shorts."
      />
      {products.length === 0 ? (
        <Empty title="Create a product first" body="A video needs something to sell. Build a product, then come back." action={<LinkButton href="/app/ideas">Find an idea</LinkButton>} />
      ) : (
        <>
          <VideoForm products={products.map((p) => ({ id: p.id, title: p.title }))} defaultProduct={products.some((p) => p.id === product) ? product : undefined} remaining={remaining} />
          {rows.length === 0 ? (
            <p className="mt-8 text-sm text-muted">No videos yet. Your scripts appear here.</p>
          ) : (
            <ul className="mt-8 grid gap-3 md:grid-cols-2">
              {rows.map(({ video: v, productTitle }) => (
                <li key={v.id}>
                  <Link href={`/app/videos/${v.id}`}>
                    <Card className="lift h-full p-5 transition-colors hover:border-ink">
                      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                        {v.seconds}s · {v.script.scenes.length} scenes · {dateTime(v.createdAt)}
                      </p>
                      <p className="mt-2 font-display text-2xl leading-tight">{v.title}</p>
                      <p className="mt-1 truncate text-sm text-muted">{productTitle}</p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
