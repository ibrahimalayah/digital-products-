import type { Metadata } from "next";
import Link from "next/link";
import { requireUserPage } from "@/lib/session";
import { appUrl } from "@/lib/env";
import { money } from "@/lib/format";
import { getVideo } from "@/server/videos";
import { publicSettings } from "@/server/settings";
import { PageHeader } from "@/components/ui";
import { VideoStudio } from "@/components/studio/video-studio";

export const metadata: Metadata = { title: "Lead video" };

export default async function VideoDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUserPage(`/app/videos/${id}`);
  const [{ video, product }, settings] = await Promise.all([getVideo(user.id, id), publicSettings(user.id)]);
  const url = `${appUrl()}/store/${product.slug}`;
  const postText = [video.script.description, url, video.script.hashtags.join(" ")].filter(Boolean).join("\n\n");
  return (
    <>
      <Link href="/app/videos" className="mb-6 inline-block text-sm text-muted hover:text-ink">
        ← Lead videos
      </Link>
      <PageHeader eyebrow={`${video.seconds}-second video`} title={video.title} description={`For “${product.title}”. Preview it, adjust the lines, then create the file.`} />
      <VideoStudio
        video={{ id: video.id, title: video.title, voice: video.voice, scenes: video.script.scenes }}
        product={{ title: product.title, accent: product.accent, published: product.status === "published" }}
        english={product.language === "en"}
        brand={settings.brandName || "Kitforge"}
        link={new URL(appUrl()).host}
        cta={`Get it · ${money(product.priceCents)}`}
        postText={postText}
      />
    </>
  );
}
