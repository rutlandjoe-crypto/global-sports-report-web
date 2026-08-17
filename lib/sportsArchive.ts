import fs from "fs";
import path from "path";

export const SPORTS_ARCHIVE_DESKS = {
  nfl: "NFL",
  "college-football": "College Football",
  mlb: "MLB",
  nba: "NBA",
  soccer: "Soccer / Football",
  fantasy: "Fantasy Sports",
} as const;

export type SportsArchiveDesk = keyof typeof SPORTS_ARCHIVE_DESKS;

export type SportsArchiveStory = {
  slug: string;
  desk: SportsArchiveDesk;
  title: string;
  summary: string;
  sourceUrl: string;
  publisher: string;
  sourceGroup: string;
  feed: string;
  publishedAt: string;
  firstSeenAt: string;
  lastSeenAt: string;
  teams: string[];
  players: string[];
  sport: string;
  competitions: string[];
  lanes: string[];
};

type ArchivePayload = {
  generatedAt?: string;
  stories?: SportsArchiveStory[];
};

let cachedArchive: ArchivePayload | null = null;

export function readSportsArchive(): ArchivePayload {
  if (cachedArchive) return cachedArchive;
  try {
    const file = path.join(process.cwd(), "public", "sports_editorial_archive.json");
    const payload = JSON.parse(fs.readFileSync(file, "utf8")) as ArchivePayload;
    cachedArchive = {
      generatedAt: payload.generatedAt || "",
      stories: Array.isArray(payload.stories) ? payload.stories : [],
    };
  } catch {
    cachedArchive = { generatedAt: "", stories: [] };
  }
  return cachedArchive;
}

export function getSportsArchiveStories(): SportsArchiveStory[] {
  return readSportsArchive().stories || [];
}

export function getSportsArchiveStory(slug: string): SportsArchiveStory | undefined {
  return getSportsArchiveStories().find((story) => story.slug === slug);
}

export function getSportsArchiveDeskStories(desk: string): SportsArchiveStory[] {
  return getSportsArchiveStories().filter((story) => story.desk === desk);
}

export function sportsArchiveLastModified(): Date {
  const raw = readSportsArchive().generatedAt;
  const parsed = raw ? new Date(raw) : null;
  return parsed && !Number.isNaN(parsed.getTime())
    ? parsed
    : new Date("2026-01-01T00:00:00.000Z");
}

export function sportsStoryDescription(story: SportsArchiveStory): string {
  return story.summary.length > 180 ? `${story.summary.slice(0, 177).trimEnd()}...` : story.summary;
}
