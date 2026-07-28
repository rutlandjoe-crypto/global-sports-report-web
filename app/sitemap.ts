import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.globalsportsreport.com";
  const deskRoutes = ["nfl", "college-football", "mlb", "nba", "soccer", "fantasy"];

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
    ...deskRoutes.map((route) => ({
      url: `${baseUrl}/${route}`,
      lastModified: new Date(),
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
  ];
}
