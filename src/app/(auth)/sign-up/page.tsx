import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Create your studio" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="font-display text-4xl leading-none">Create your studio</h1>
      <p className="mb-6 mt-2 text-sm text-muted">Free plan. No card needed.</p>
      <AuthForm mode="sign-up" next={next} />
    </>
  );
}
