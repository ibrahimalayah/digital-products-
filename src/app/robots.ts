import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/env";

/** Public pages are open to search engines; the studio, control panel and API are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/app", "/admin", "/api", "/claim", "/sign-in", "/sign-up", "/forgot-password", "/reset-password"] }],
    sitemap: `${appUrl()}/sitemap.xml`,
  };
}
