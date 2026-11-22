import type { Metadata } from "next";
import { requireUserPage } from "@/lib/session";
import { getT } from "@/lib/i18n-server";
import { publicSettings } from "@/server/settings";
import { PageHeader } from "@/components/ui";
import { SettingsForm } from "@/components/studio/settings-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Settings") };
}

export default async function Settings() {
  const user = await requireUserPage("/app/settings");
  const [s, t] = await Promise.all([publicSettings(user.id), getT()]);
  return (
    <>
      <PageHeader eyebrow={t("Settings")} title={t("Workspace settings")} />
      <SettingsForm initial={{ brandName: s.brandName, brandVoice: s.brandVoice, language: s.language, publisher: s.publisher, publisherConnected: s.publisherConnected }} />
    </>
  );
}
