import fs from "fs";
import path from "path";

export type DeskStory = {
  id: string;
  desk?: string;
  title: string;
  summary?: string;
  url: string;
  canonical_url?: string;
  publisher: string;
  published_at?: string;
  teams?: string[];
  players?: string[];
  lanes?: string[];
  source_group?: string;
};

export type DeskModule = {
  label: string;
  items: Array<Record<string, unknown>>;
};

export type SportsDesk = {
  id: string;
  slug: string;
  label: string;
  sport: string;
  competitions: string[];
  geographic_profile: "us" | "international";
  stories: DeskStory[];
  data: {
    scores: Array<Record<string, unknown>>;
    schedule: Array<Record<string, unknown>>;
    standings: Array<Record<string, unknown>>;
    rankings: Array<Record<string, unknown>>;
  };
  modules: Record<string, DeskModule>;
  content_updated_at?: string;
  updated_at?: string;
  data_updated_at?: Record<string, string>;
};

export type HomepageEditorial = {
  hero?: DeskStory;
  stories?: DeskStory[];
  updated_at?: string;
};

export type SportsDeskPayload = {
  generated_at?: string;
  homepage?: HomepageEditorial;
  desks?: Record<string, SportsDesk>;
};

export function readSportsDeskPayload(): SportsDeskPayload {
  try {
    const file = path.join(process.cwd(), "public", "sports_desks.json");
    return JSON.parse(fs.readFileSync(file, "utf8")) as SportsDeskPayload;
  } catch (error) {
    console.error("Sports desk data unavailable:", error);
    return {};
  }
}

export function getSportsDesk(id: string): { desk: SportsDesk | null; contentUpdatedAt: string } {
  const payload = readSportsDeskPayload();
  const desk = payload.desks?.[id] ?? null;
  return { desk, contentUpdatedAt: desk?.content_updated_at ?? "" };
}
