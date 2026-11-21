import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { NewProductForm } from "@/components/studio/product-form";

export const metadata: Metadata = { title: "New product" };

export default function NewProduct() {
  return (
    <>
      <PageHeader eyebrow="Products" title="Write the brief" description="Four lines are enough. You generate the pages on the next screen." />
      <NewProductForm />
    </>
  );
}
