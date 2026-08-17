import type { MetadataRoute } from "next";
import {
  SPORTS_ARCHIVE_DESKS,
  getSportsArchiveStories,
  sportsArchiveLastModified,
} from "@/lib/sportsArchive";

export const dynamic = "force-dynamic";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.globalsportsreport.com";
  const deskRoutes = ["nfl", "college-football", "mlb", "nba", "soccer", "fantasy"];
  const stories = getSportsArchiveStories();
  const lastModified = sportsArchiveLastModified();

  return [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: "hourly",
      priority: 1,
    },
    ...deskRoutes.map((route) => ({
      url: `${baseUrl}/${route}`,
      lastModified,
      changeFrequency: "hourly" as const,
      priority: 0.8,
    })),
    {
      url: `${baseUrl}/archive`,
      lastModified,
      changeFrequency: "hourly" as const,
      priority: 0.7,
    },
    ...Object.keys(SPORTS_ARCHIVE_DESKS).map((desk) => ({
      url: `${baseUrl}/archive/${desk}`,
      lastModified,
      changeFrequency: "hourly" as const,
      priority: 0.6,
    })),
    ...stories.map((story) => ({
      url: `${baseUrl}/stories/${story.slug}`,
      lastModified: new Date(story.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
