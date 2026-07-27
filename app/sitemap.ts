import type { MetadataRoute } from "next";
import { LIVE_SPORTS_DESKS } from "@/components/sports-desk/desks";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.globalsportsreport.com";

  const sportsDeskRoutes = new Set([
    "/apps/sports-desk",
    ...LIVE_SPORTS_DESKS.map((desk) => desk.href),
    "/nfl",
    "/college-football",
    "/mlb",
    "/soccer",
    "/fantasy",
    "/wnba",
  ]);

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    ...Array.from(sportsDeskRoutes).map((route) => ({
      url: `${baseUrl}${route}`,
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: route === "/apps/sports-desk" ? 0.9 : 0.8,
    })),
  ];
}