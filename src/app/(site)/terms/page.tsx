import type { Metadata } from "next";
import { msg } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return { title: t("Terms, rights and privacy"), description: t("Who owns what on Kitforge, what buyers may do with a product, and how personal data is handled.") };
}

const sections: { title: string; points: string[] }[] = [
  {
    title: msg("Creators keep their rights"),
    points: [
      msg("You own the products, scripts, posts and videos you make here, and you decide their price and whether they are published."),
      msg("You are responsible for what you publish: check the content, make sure it is accurate, and do not use other people's protected text, names, photos or likenesses without permission."),
      msg("The built-in children's drawings and paper models are part of the platform. You may sell them inside products you make here; you may not resell them on their own as a drawing library."),
    ],
  },
  {
    title: msg("What buyers may do"),
    points: [
      msg("A purchase gives one person a licence to download and print the product for personal use, including for their own household or classroom."),
      msg("Buyers may not copy, share, resell or republish a product, in whole or in part. Every PDF carries this notice on its cover."),
      msg("Products are educational material, not legal, medical or financial advice."),
    ],
  },
  {
    title: msg("AI-made content"),
    points: [
      msg("Ideas, pages, posts and video scripts are drafted by AI models and reviewed by the creator before sale."),
      msg("Lead videos use a synthetic voice and are labelled “AI voice”. Presenter photos and clips stay on the creator's device and are never uploaded to us."),
    ],
  },
  {
    title: msg("Your data"),
    points: [
      msg("Accounts: we store your name, email and a protected (hashed) password to sign you in. Payments are handled by Stripe; we never see card numbers."),
      msg("Leads: if you leave your email on a product page, it is shared only with that product's seller, for messages about that product. Ask the seller, or us, to remove it at any time."),
      msg("Connected publishing keys are stored encrypted and are used only to schedule the posts you approve."),
      msg("We do not sell personal data."),
    ],
  },
];

export default async function Terms() {
  const t = await getT();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent">{t("Terms")}</p>
      <h1 className="mt-3 font-display text-5xl leading-none tracking-tight">{t("Terms, rights and privacy")}</h1>
      <p className="mt-5 text-lg text-muted">{t("The short version of how this platform treats creators, buyers and their data.")}</p>
      <div className="mt-10 space-y-10">
        {sections.map((s) => (
          <section key={s.title}>
            <h2 className="font-display text-3xl">{t(s.title)}</h2>
            <ul className="mt-4 list-disc space-y-2 ps-5 leading-relaxed">
              {s.points.map((p) => (
                <li key={p}>{t(p)}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
