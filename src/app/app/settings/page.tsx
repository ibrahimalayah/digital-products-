import type { Metadata } from "next";
import { requireUserPage } from "@/lib/session";
import { publicSettings } from "@/server/settings";
import { PageHeader } from "@/components/ui";
import { SettingsForm } from "@/components/studio/settings-form";

export const metadata: Metadata = { title: "Settings" };

export default async function Settings() {
  const user = await requireUserPage("/app/settings");
  const s = await publicSettings(user.id);
  return (
    <>
      <PageHeader eyebrow="Settings" title="Workspace settings" />
      <SettingsForm initial={{ brandName: s.brandName, brandVoice: s.brandVoice, publisher: s.publisher, publisherConnected: s.publisherConnected }} />
    </>
  );
}
