import type { Metadata } from "next";
import { getT } from "@/lib/i18n-server";
import { PageHeader } from "@/components/ui";
import { NewProductForm } from "@/components/studio/product-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("New product") };
}

export default async function NewProduct() {
  const t = await getT();
  return (
    <>
      <PageHeader eyebrow={t("Products")} title={t("Write the brief")} description={t("Four lines are enough. You generate the pages on the next screen.")} />
      <NewProductForm />
    </>
  );
}
