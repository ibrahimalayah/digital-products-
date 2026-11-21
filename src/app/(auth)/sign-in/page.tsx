import type { Metadata } from "next";
import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Welcome back" };

export default async function Page({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <>
      <h1 className="font-display text-4xl leading-none">Welcome back</h1>
      <p className="mb-6 mt-2 text-sm text-muted">Sign in to your studio.</p>
      <AuthForm mode="sign-in" next={next} />
    </>
  );
}
