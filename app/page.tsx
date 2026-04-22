import React from "react";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;
type JsonObject = { [key: string]: JsonValue | undefined };

type GamesData = {
  live?: string[];
  upcoming?: string[];
  final?: string[];
};

type ReportSection = JsonObject & {
  name?: string;
  key?: string;
  label?: string;
  title?: string;
  headline?: string;
  snapshot?: string | string[];
  key_storylines?: string[];
  key_data_points?: string[];
  why_it_matters?: string[];
  story_angles?: string[];
  final_scores?: string[];
  live?: string[];
  upcoming?: string[];
  source_file?: string;
  updated_at?: string;
  content?: JsonValue;
  structured_sections?: JsonObject;
  advanced?: JsonObject;
  games?: GamesData;
};

type RootReport = JsonObject & {
  title?: string;
  headline?: string;
  key_storylines?: string[];
  snapshot?: string | string[];
  generated_at?: string;
  generated_date?: string;
  updated_at?: string;
  published_at?: string;
  disclaimer?: string;
  x_handle?: string;
  x_url?: string;
  twitter_url?: string;
  substack_url?: string;
  telegram_url?: string;
  telegram_handle?: string;
  sections?: ReportSection[];
  sections_map?: Record<string, ReportSection>;
};

const VIDEO_URL = "https://www.youtube.com/embed/PMDQ82w1pAE";

const TELEGRAM_URL_ENV =
  process.env.NEXT_PUBLIC_GSR_TELEGRAM_URL ||
  process.env.GSR_TELEGRAM_URL ||
  "";

const SECTION_ORDER = [
  "MLB",
  "NBA",
  "NHL",
  "NFL",
  "NFL DRAFT SIGNALS",
  "NCAAFB",
  "SOCCER",
  "FANTASY",
  "BETTING",
];

const SECTION_LABELS: Record<string, string> = {
  MLB: "MLB",
  NBA: "NBA",
  NHL: "NHL",
  NFL: "NFL",
  "NFL DRAFT SIGNALS": "NFL Draft Signals",
  NCAAFB: "NCAA Football",
  SOCCER: "Soccer",
  FANTASY: "Fantasy",
  BETTING: "Betting Odds",
};

const ROOT_SECTION_ALIASES: Record<string, string[]> = {
  MLB: ["MLB", "mlb"],
  NBA: ["NBA", "nba"],
  NHL: ["NHL", "nhl"],
  NFL: ["NFL", "nfl"],
  "NFL DRAFT SIGNALS": ["NFL DRAFT SIGNALS", "nfl_draft_signals", "nfl draft signals"],
  NCAAFB: ["NCAAFB", "ncaafb", "college_football", "college football"],
  SOCCER: ["SOCCER", "soccer"],
  FANTASY: ["FANTASY", "fantasy"],
  BETTING: ["BETTING", "BETTING ODDS", "betting", "betting_odds", "betting odds"],
};

const ROOT_META_KEYS = new Set([
  "title",
  "headline",
  "key_storylines",
  "snapshot",
  "generated_at",
  "generated_date",
  "updated_at",
  "published_at",
  "disclaimer",
  "x_handle",
  "x_url",
  "twitter_url",
  "substack_url",
  "telegram_url",
  "telegram_handle",
  "sections",
  "sections_map",
]);

const STRUCTURED_HIDE_KEYS = new Set([
  "headline",
  "snapshot",
  "static_graphic",
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonObject(value: unknown): value is JsonObject {
  return isObject(value);
}

function isReportSection(value: unknown): value is ReportSection {
  return isObject(value);
}

function normalizeText(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/â€™/g, "’")
    .replace(/â€œ/g, "“")
    .replace(/â€/g, "”")
    .replace(/â€”/g, "—")
    .replace(/â€“/g, "–")
    .replace(/V�squez/g, "Vásquez")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function toTitleCase(input: string): string {
  return input
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatLabel(input: string): string {
  return SECTION_LABELS[input] || toTitleCase(input);
}

function pickFirstString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return normalizeText(value);
    }
  }
  return "";
}

function splitParagraphs(text: string): string[] {
  return normalizeText(text)
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitLines(text: string): string[] {
  return normalizeText(text)
    .split("\n")
    .map((part) => part.trim())
    .filter(Boolean);
}

function arrayifyStrings(value: unknown): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => arrayifyStrings(item))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const text = normalizeText(value);

    if (text.includes("\n- ") || text.startsWith("- ")) {
      return text
        .split("\n")
        .map((line) => line.replace(/^[-*•]\s*/, "").trim())
        .filter(Boolean);
    }

    return splitLines(text);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  return [];
}

function flattenToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return normalizeText(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return value.map((item) => flattenToText(item)).filter(Boolean).join("\n");
  }

  if (isObject(value)) {
    const preferredKeys = [
      "headline",
      "snapshot",
      "summary",
      "overview",
      "analysis",
      "content",
      "body",
      "text",
      "notes",
      "report",
    ];

    const chunks: string[] = [];

    for (const key of preferredKeys) {
      if (key in value) {
        const text = flattenToText(value[key]);
        if (text) chunks.push(text);
      }
    }

    for (const [key, nested] of Object.entries(value)) {
      if (preferredKeys.includes(key)) continue;
      const text = flattenToText(nested);
      if (text) chunks.push(`${formatLabel(key)}\n${text}`);
    }

    return chunks.join("\n\n").trim();
  }

  return "";
}

function normalizeSectionName(section: ReportSection): string {
  return pickFirstString(section.name, section.key, section.label, section.title).toUpperCase();
}

async function loadLatestReport(): Promise<RootReport> {
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") || h.get("host");
    const proto =
      h.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");

    if (!host) return {};

    const response = await fetch(`${proto}://${host}/api/report`, {
      cache: "no-store",
    });

    if (!response.ok) return {};

    const data = await response.json();
    return isObject(data) ? (data as RootReport) : {};
  } catch {
    return {};
  }
}

function deriveGamesFromValue(value: Record<string, unknown>): GamesData | undefined {
  const gameObj = isObject(value.games) ? value.games : undefined;

  const live = arrayifyStrings(gameObj?.live ?? value.live ?? value.live_games);
  const upcoming = arrayifyStrings(
    gameObj?.upcoming ?? value.upcoming ?? value.upcoming_games ?? value.today_schedule
  );
  const final = arrayifyStrings(
    gameObj?.final ??
      value.final ??
      value.final_scores ??
      value.recent_final_scores ??
      value.today_results
  );

  if (!live.length && !upcoming.length && !final.length) return undefined;

  return {
    live: live.length ? live : undefined,
    upcoming: upcoming.length ? upcoming : undefined,
    final: final.length ? final : undefined,
  };
}

function coerceSection(sectionName: string, value: unknown): ReportSection | null {
  if (value === null || value === undefined) return null;

  if (!isObject(value)) {
    const text = flattenToText(value);
    if (!text) return null;

    return {
      name: sectionName,
      title: formatLabel(sectionName),
      content: text,
    };
  }

  const obj = value as Record<string, unknown>;
  const games = deriveGamesFromValue(obj);

  const structuredEntries = Object.entries(obj).filter(([key]) => {
    return ![
      "name",
      "key",
      "label",
      "title",
      "headline",
      "snapshot",
      "summary",
      "overview",
      "key_storylines",
      "top_storylines",
      "updated_at",
      "generated_at",
      "published_at",
      "source_file",
      "games",
      "live",
      "upcoming",
      "final",
      "live_games",
      "upcoming_games",
      "final_scores",
      "recent_final_scores",
      "today_results",
      "today_schedule",
      "content",
      "advanced",
    ].includes(key);
  });

  const structured_sections =
    structuredEntries.length > 0
      ? (Object.fromEntries(structuredEntries) as JsonObject)
      : undefined;

  return {
    name: sectionName,
    key: pickFirstString(obj.key) || sectionName,
    label: pickFirstString(obj.label) || formatLabel(sectionName),
    title: pickFirstString(obj.title) || formatLabel(sectionName),
    headline: pickFirstString(obj.headline),
    snapshot:
      pickFirstString(obj.snapshot) ||
      pickFirstString(obj.summary) ||
      pickFirstString(obj.overview) ||
      undefined,
    key_storylines: arrayifyStrings(obj.key_storylines ?? obj.top_storylines),
    key_data_points: arrayifyStrings(obj.key_data_points),
    why_it_matters: arrayifyStrings(obj.why_it_matters),
    story_angles: arrayifyStrings(obj.story_angles),
    final_scores: arrayifyStrings(obj.final_scores ?? obj.recent_final_scores),
    live: arrayifyStrings(obj.live ?? obj.live_games),
    upcoming: arrayifyStrings(obj.upcoming ?? obj.upcoming_games ?? obj.today_schedule),
    source_file: pickFirstString(obj.source_file),
    updated_at:
      pickFirstString(obj.updated_at) ||
      pickFirstString(obj.generated_at) ||
      pickFirstString(obj.published_at) ||
      undefined,
    content: obj.content as JsonValue | undefined,
    structured_sections,
    advanced: isObject(obj.advanced) ? (obj.advanced as JsonObject) : undefined,
    games,
  };
}

function deriveSectionsFromRoot(data: RootReport): ReportSection[] {
  const sections: ReportSection[] = [];

  for (const sectionName of SECTION_ORDER) {
    const aliases = ROOT_SECTION_ALIASES[sectionName] || [sectionName];
    let matched: unknown = undefined;

    for (const alias of aliases) {
      if (alias in data) {
        matched = data[alias];
        break;
      }
    }

    const section = coerceSection(sectionName, matched);
    if (section) sections.push(section);
  }

  if (sections.length > 0) return sections;

  for (const [key, value] of Object.entries(data)) {
    if (ROOT_META_KEYS.has(key)) continue;
    const section = coerceSection(key.toUpperCase(), value);
    if (section) sections.push(section);
  }

  return sections;
}

function getSections(data: RootReport): ReportSection[] {
  const fromSections = Array.isArray(data.sections)
    ? data.sections.filter(isReportSection)
    : [];

  const fromMap = isObject(data.sections_map)
    ? Object.values(data.sections_map).filter(isReportSection)
    : [];

  const derived = deriveSectionsFromRoot(data);

  const combined = [...fromSections];
  const seen = new Set(combined.map((section) => normalizeSectionName(section)));

  for (const section of [...fromMap, ...derived]) {
    const key = normalizeSectionName(section);
    if (!seen.has(key)) {
      combined.push(section);
      seen.add(key);
    }
  }

  combined.sort((a, b) => {
    const aName = normalizeSectionName(a);
    const bName = normalizeSectionName(b);
    const aIndex = SECTION_ORDER.indexOf(aName);
    const bIndex = SECTION_ORDER.indexOf(bName);

    if (aIndex === -1 && bIndex === -1) return aName.localeCompare(bName);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  return combined;
}

function getSectionDisplayName(section: ReportSection): string {
  const raw = pickFirstString(section.name, section.key, section.label, section.title);
  return raw ? formatLabel(raw) : "Section";
}

function getRootStatCards(data: RootReport, sections: ReportSection[]) {
  const cards: Array<{ label: string; value: string }> = [];

  if (sections.length) cards.push({ label: "Reports", value: String(sections.length) });

  const snapshot = flattenToText(data.snapshot);
  if (snapshot) cards.push({ label: "Snapshot", value: snapshot });

  const generatedAt = pickFirstString(
    data.generated_at,
    data.updated_at,
    data.published_at,
    data.generated_date
  );
  if (generatedAt) cards.push({ label: "Updated", value: generatedAt });

  const handle = pickFirstString(data.x_handle);
  if (handle) cards.push({ label: "X Handle", value: handle });

  return cards.slice(0, 4);
}

function getXUrl(data: RootReport): string {
  const explicit = pickFirstString(data.x_url, data.twitter_url);
  if (explicit) return explicit;

  const handle = pickFirstString(data.x_handle);
  if (!handle) return "";

  const clean = handle.replace(/^@/, "").trim();
  return clean ? `https://x.com/${clean}` : "";
}

function getTelegramUrl(data: RootReport): string {
  const explicit = pickFirstString(data.telegram_url, TELEGRAM_URL_ENV);
  if (explicit) return explicit;

  const handle = pickFirstString(data.telegram_handle);
  if (!handle) return "";

  const clean = handle.replace(/^@/, "").trim();
  return clean ? `https://t.me/${clean}` : "";
}

function hasRenderableBody(section: ReportSection): boolean {
  const structuredSections = isJsonObject(section.structured_sections)
    ? section.structured_sections
    : undefined;
  const advanced = isJsonObject(section.advanced) ? section.advanced : undefined;

  const visibleStructuredEntries = structuredSections
    ? Object.entries(structuredSections).filter(
        ([key, value]) => !STRUCTURED_HIDE_KEYS.has(key) && flattenToText(value).trim()
      )
    : [];

  return Boolean(
    pickFirstString(section.headline) ||
      flattenToText(section.snapshot).trim() ||
      arrayifyStrings(section.key_storylines).length ||
      arrayifyStrings(section.key_data_points).length ||
      arrayifyStrings(section.why_it_matters).length ||
      arrayifyStrings(section.story_angles).length ||
      arrayifyStrings(section.live).length ||
      arrayifyStrings(section.upcoming).length ||
      arrayifyStrings(section.final_scores).length ||
      arrayifyStrings(section.games?.live).length ||
      arrayifyStrings(section.games?.upcoming).length ||
      arrayifyStrings(section.games?.final).length ||
      visibleStructuredEntries.length ||
      (advanced && Object.keys(advanced).length) ||
      flattenToText(section.content).trim()
  );
}

function renderSimpleList(items: string[]) {
  if (!items.length) return null;

  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li
          key={`${item}-${index}`}
          className="rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm leading-6 text-zinc-100 break-words whitespace-normal"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function renderParagraphs(text: string) {
  const paragraphs = splitParagraphs(text).slice(0, 5);
  if (!paragraphs.length) return null;

  return (
    <div className="space-y-2.5">
      {paragraphs.map((paragraph, index) => (
        <p
          key={index}
          className="text-sm leading-6 text-zinc-200 break-words whitespace-normal"
        >
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function renderContent(value: unknown): React.ReactNode {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const text = normalizeText(value);
    const listish = arrayifyStrings(text);

    if (text.includes("\n") && listish.length >= 2) {
      return renderSimpleList(listish);
    }

    return renderParagraphs(text);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return <p className="text-sm leading-6 text-zinc-200">{String(value)}</p>;
  }

  if (Array.isArray(value)) {
    const items = value.flatMap((item) => arrayifyStrings(item));
    return renderSimpleList(items);
  }

  if (isObject(value)) {
    const entries = Object.entries(value).filter(([, v]) => flattenToText(v).trim());
    if (!entries.length) return null;

    return (
      <div className="grid gap-3 lg:grid-cols-2">
        {entries.map(([key, nested]) => (
          <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="mb-2 text-[11px] uppercase tracking-[0.18em] text-zinc-500">
              {formatLabel(key)}
            </div>
            {renderContent(nested)}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

function SectionShell({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  if (!children) return null;

  return (
    <section className="rounded-xl border border-zinc-800 bg-[#0b0b0f] p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-white">
        {title}
      </h3>
      {children}
    </section>
  );
}

function PlatformButtons({ data }: { data: RootReport }) {
  const substackUrl = pickFirstString(data.substack_url);
  const xUrl = getXUrl(data);
  const telegramUrl = getTelegramUrl(data);

  const buttons = [
    { label: "Substack", href: substackUrl },
    { label: "X / Twitter", href: xUrl },
    { label: "Telegram", href: telegramUrl },
  ].filter((item) => item.href);

  if (!buttons.length) return null;

  return (
    <div className="flex flex-wrap gap-2.5">
      {buttons.map((button) => (
        <a
          key={button.label}
          href={button.href}
          target="_blank"
          rel="noreferrer"
          className="rounded-full border border-zinc-700 bg-black px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white transition hover:border-zinc-500 hover:bg-zinc-900"
        >
          {button.label}
        </a>
      ))}
    </div>
  );
}

function SportSectionCard({ section }: { section: ReportSection }) {
  const displayName = getSectionDisplayName(section);
  const title = pickFirstString(section.title) || displayName;
  const headline = pickFirstString(section.headline);
  const snapshot = pickFirstString(section.snapshot);
  const keyStorylines = arrayifyStrings(section.key_storylines);
  const keyDataPoints = arrayifyStrings(section.key_data_points);
  const whyItMatters = arrayifyStrings(section.why_it_matters);
  const storyAngles = arrayifyStrings(section.story_angles);
  const updatedAt = pickFirstString(section.updated_at);

  const liveItems = arrayifyStrings(section.games?.live).length
    ? arrayifyStrings(section.games?.live)
    : arrayifyStrings(section.live);

  const upcomingItems = arrayifyStrings(section.games?.upcoming).length
    ? arrayifyStrings(section.games?.upcoming)
    : arrayifyStrings(section.upcoming);

  const finalItems = arrayifyStrings(section.games?.final).length
    ? arrayifyStrings(section.games?.final)
    : arrayifyStrings(section.final_scores);

  const structuredSections = isJsonObject(section.structured_sections)
    ? Object.entries(section.structured_sections).filter(
        ([key, value]) => !STRUCTURED_HIDE_KEYS.has(key) && flattenToText(value).trim()
      )
    : [];

  const advancedEntries = isJsonObject(section.advanced)
    ? Object.entries(section.advanced).filter(([, value]) => flattenToText(value).trim())
    : [];

  const fallbackContent = flattenToText(section.content).trim();

  return (
    <section className="rounded-2xl border border-zinc-800 bg-gradient-to-r from-[#111117] to-[#0b0b0f] p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-bold uppercase tracking-[0.14em] text-white break-words">
            {title}
          </h2>
          {headline ? (
            <p className="mt-2 max-w-4xl text-sm leading-6 text-zinc-200 break-words whitespace-normal">
              {headline}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.18em] text-zinc-400">
          <span className="rounded-full border border-zinc-700 px-3 py-1.5">
            {displayName}
          </span>
          {updatedAt ? (
            <span className="rounded-full border border-zinc-700 px-3 py-1.5">
              {updatedAt}
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-4">
        {snapshot ? (
          <SectionShell title="Snapshot">{renderParagraphs(snapshot)}</SectionShell>
        ) : null}

        {keyStorylines.length > 0 ? (
          <SectionShell title="Key Storylines">{renderSimpleList(keyStorylines)}</SectionShell>
        ) : null}

        {(liveItems.length || upcomingItems.length || finalItems.length) ? (
          <div className="grid gap-3 xl:grid-cols-3">
            {liveItems.length > 0 ? (
              <SectionShell title="Live Games">{renderSimpleList(liveItems)}</SectionShell>
            ) : null}
            {upcomingItems.length > 0 ? (
              <SectionShell title="Upcoming Games">{renderSimpleList(upcomingItems)}</SectionShell>
            ) : null}
            {finalItems.length > 0 ? (
              <SectionShell title="Final Scores">{renderSimpleList(finalItems)}</SectionShell>
            ) : null}
          </div>
        ) : null}

        {(keyDataPoints.length || whyItMatters.length || storyAngles.length) ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {keyDataPoints.length > 0 ? (
              <SectionShell title="Key Data Points">{renderSimpleList(keyDataPoints)}</SectionShell>
            ) : null}
            {whyItMatters.length > 0 ? (
              <SectionShell title="Why It Matters">{renderSimpleList(whyItMatters)}</SectionShell>
            ) : null}
            {storyAngles.length > 0 ? (
              <SectionShell title="Story Angles">{renderSimpleList(storyAngles)}</SectionShell>
            ) : null}
          </div>
        ) : null}

        {structuredSections.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {structuredSections.map(([key, value]) => (
              <SectionShell key={key} title={formatLabel(key)}>
                {renderContent(value)}
              </SectionShell>
            ))}
          </div>
        ) : null}

        {advancedEntries.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {advancedEntries.map(([key, value]) => (
              <SectionShell key={key} title={formatLabel(key)}>
                {renderContent(value)}
              </SectionShell>
            ))}
          </div>
        ) : null}

        {fallbackContent ? (
          <SectionShell title="Report Details">{renderParagraphs(fallbackContent)}</SectionShell>
        ) : null}
      </div>
    </section>
  );
}

export default async function Page() {
  const data = await loadLatestReport();
  const sections = getSections(data).filter(hasRenderableBody);

  const title = pickFirstString(data.title) || "Global Sports Report";
  const headline = pickFirstString(data.headline);
  const generatedAt = pickFirstString(
    data.generated_at,
    data.updated_at,
    data.published_at,
    data.generated_date
  );

  const topStorylines =
    arrayifyStrings(data.key_storylines).length > 0
      ? arrayifyStrings(data.key_storylines)
      : sections
          .map((section) => {
            const name = getSectionDisplayName(section);
            const liveCount =
              arrayifyStrings(section.games?.live).length || arrayifyStrings(section.live).length;
            const upcomingCount =
              arrayifyStrings(section.games?.upcoming).length ||
              arrayifyStrings(section.upcoming).length;
            const finalCount =
              arrayifyStrings(section.games?.final).length ||
              arrayifyStrings(section.final_scores).length;
            const snap = pickFirstString(section.snapshot);

            if (liveCount || upcomingCount || finalCount) {
              return `${name} shows ${liveCount} live and ${upcomingCount} upcoming on the board.`;
            }

            if (snap) return `${name} snapshot: ${snap}`;
            return "";
          })
          .filter(Boolean)
          .slice(0, 8);

  const statCards = getRootStatCards(data, sections);

  const disclaimer =
    pickFirstString(data.disclaimer) ||
    "This report is an automated summary intended to support, not replace, human sports journalism.";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
        <header className="rounded-2xl border border-zinc-800 bg-gradient-to-r from-[#121218] via-[#09090c] to-[#121218] p-5">
          <div className="grid gap-5 lg:grid-cols-[1.5fr_0.72fr]">
            <div className="min-w-0 space-y-4">
              <div className="inline-flex items-center rounded-full border border-zinc-700 bg-black px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-zinc-300">
                Global Sports Report
              </div>

              <div className="space-y-3 min-w-0">
                <h1 className="text-3xl font-black uppercase leading-none tracking-[0.12em] text-white break-words sm:text-4xl lg:text-5xl">
                  {title}
                </h1>

                {headline ? (
                  <p className="max-w-4xl text-base leading-7 text-zinc-100 break-words whitespace-normal">
                    {headline}
                  </p>
                ) : null}

                <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-zinc-400">
                  {generatedAt ? (
                    <span className="rounded-full border border-zinc-700 px-3 py-1.5">
                      Updated: {generatedAt}
                    </span>
                  ) : null}

                  {pickFirstString(data.x_handle) ? (
                    <span className="rounded-full border border-zinc-700 px-3 py-1.5">
                      {pickFirstString(data.x_handle)}
                    </span>
                  ) : null}
                </div>
              </div>

              <PlatformButtons data={data} />

              {statCards.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {statCards.map((card) => (
                    <div
                      key={`${card.label}-${card.value}`}
                      className="rounded-xl border border-zinc-800 bg-black p-4 min-w-0"
                    >
                      <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">
                        {card.label}
                      </div>
                      <div className="mt-2 text-base font-semibold leading-6 text-white break-words whitespace-normal">
                        {card.value}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-zinc-800 bg-[#0a0a0d] p-4 min-w-0">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
                  Live Sports Video
                </h2>
                <span className="rounded-full border border-red-700/60 bg-red-950/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-red-300">
                  24/7
                </span>
              </div>

              <div className="overflow-hidden rounded-lg border border-zinc-800 bg-black">
                <div className="aspect-video">
                  <iframe
                    src={VIDEO_URL}
                    title="Global Sports Report Live Video"
                    className="h-full w-full"
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                  />
                </div>
              </div>

              <p className="mt-3 text-xs leading-5 text-zinc-500">{disclaimer}</p>
            </div>
          </div>
        </header>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
          <section className="rounded-xl border border-zinc-800 bg-[#0b0b0f] p-4">
            <h2 className="mb-3 text-base font-semibold uppercase tracking-[0.16em] text-white">
              Key Storylines
            </h2>

            {topStorylines.length > 0 ? (
              renderSimpleList(topStorylines)
            ) : (
              <p className="text-sm leading-6 text-zinc-400">
                No storyline data is available in the current report.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-zinc-800 bg-[#0b0b0f] p-4">
            <h2 className="mb-3 text-base font-semibold uppercase tracking-[0.16em] text-white">
              Daily Snapshot
            </h2>
            {pickFirstString(data.snapshot) ? (
              renderParagraphs(pickFirstString(data.snapshot))
            ) : (
              <p className="text-sm leading-6 text-zinc-400">
                No root snapshot is available in the current report.
              </p>
            )}
          </section>
        </div>

        <div className="mt-5 space-y-4">
          {sections.map((section, index) => (
            <SportSectionCard
              key={`${pickFirstString(section.name, section.title, section.key, section.label)}-${index}`}
              section={section}
            />
          ))}
        </div>

        <footer className="mt-6 rounded-xl border border-zinc-800 bg-[#0a0a0d] p-4 text-sm leading-6 text-zinc-400">
          <p>{disclaimer}</p>
        </footer>
      </div>
    </main>
  );
}