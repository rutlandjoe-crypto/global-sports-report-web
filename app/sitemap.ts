import type { MetadataRoute } from "next";
import { LIVE_SPORTS_DESKS } from "@/components/sports-desk/desks";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.globalsportsreport.com";

  const sportsDeskRoutes = [
    "/apps/sports-desk",
    ...LIVE_SPORTS_DESKS.map((desk) => desk.href),
  ];

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    ...sportsDeskRoutes.map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: route === "/apps/sports-desk" ? 0.9 : 0.8,
    })),
  ];
}