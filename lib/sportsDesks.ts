import type { Metadata } from "next";
import { readLiveSportsJson } from "@/lib/liveSportsJson";

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
  providers?: Record<string, { label: string; url: string; available: boolean }>;
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

export async function readSportsDeskPayload(): Promise<SportsDeskPayload> {
  try {
    return await readLiveSportsJson<SportsDeskPayload>(
      "reports/sports_desks.json",
      "sports_desks.json",
    );
  } catch (error) {
    console.error("Sports desk data unavailable:", error);
    return {};
  }
}

export async function getSportsDesk(id: string): Promise<{ desk: SportsDesk | null; contentUpdatedAt: string }> {
  const payload = await readSportsDeskPayload();
  const desk = payload.desks?.[id] ?? null;
  return { desk, contentUpdatedAt: desk?.content_updated_at ?? "" };
}

export function sportsDeskMetadata(id: string, label: string): Metadata {
  return {
    title: `${label} Sports Desk | Global Sports Report`,
    description: `Current ${label} reporting selected by the Global Sports Report Sports Desk.`,
    alternates: { canonical: `https://www.globalsportsreport.com/${id}` },
  };
}
