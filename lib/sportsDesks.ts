import fs from "fs";
import path from "path";

export type DeskStory = {
  id: string;
  title: string;
  summary?: string;
  url: string;
  publisher: string;
  published_at?: string;
  teams?: string[];
  players?: string[];
  lanes?: string[];
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
  };
  modules: Record<string, DeskModule>;
  updated_at?: string;
};

type SportsDeskPayload = {
  generated_at?: string;
  desks?: Record<string, SportsDesk>;
};

export function getSportsDesk(id: string): { desk: SportsDesk | null; generatedAt: string } {
  try {
    const file = path.join(process.cwd(), "public", "sports_desks.json");
    const payload = JSON.parse(fs.readFileSync(file, "utf8")) as SportsDeskPayload;
    const desk = payload.desks?.[id] ?? null;
    return { desk, generatedAt: desk?.updated_at ?? payload.generated_at ?? "" };
  } catch (error) {
    console.error(`Sports desk data unavailable for ${id}:`, error);
    return { desk: null, generatedAt: "" };
  }
}
