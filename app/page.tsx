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

const RECENT_FINAL_KEYS = new Set([
  "today_final_scores",
  "yesterday_final_scores",
  "recent_final_scores",
  "final_scores",
  "today_results",
]);

const COMPACT_KEYS = new Set([
  "key_data_points",
  "story_angles",
  "why_it_matters",
  "current_data_and_analytics",
  "historical_context",
  "news",
  "watch_list",
  "team_capital_watch",
  "draft_calendar",
  "top_10_draft_order",
  "day_2_opening_board",
  "today_final_scores",
  "yesterday_final_scores",
  "recent_final_scores",
  "final_scores",
  "upcoming_games",
  "live_games",
  "today_schedule",
  "today_results",
  "top_storylines",
  "key_storylines",
  "notes",
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

function flattenToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return normalizeText(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    return value.map((item) => flattenToText(item)).filter(Boolean).join("\n");
  }

  if (isObject(value)) {
    const priorityKeys = [
      "headline",
      "snapshot",
      "summary",
      "content",
      "body",
      "text",
      "report",
      "overview",
      "analysis",
      "description",
      "notes",
    ];

    const chunks: string[] = [];

    for (const key of priorityKeys) {
      if (key in value) {
        const rendered = flattenToText(value[key]);
        if (rendered) chunks.push(rendered);
      }
    }

    for (const [key, nested] of Object.entries(value)) {
      if (priorityKeys.includes(key)) continue;
      const rendered = flattenToText(nested);
      if (!rendered) continue;
      chunks.push(`${formatLabel(key)}\n${rendered}`);
    }

    return chunks.join("\n\n").trim();
  }

  return "";
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

async function loadLatestReport(): Promise<RootReport> {
  try {
    const incomingHeaders = await headers();
    const host = incomingHeaders.get("x-forwarded-host") || incomingHeaders.get("host");
    const proto =
      incomingHeaders.get("x-forwarded-proto") ||
      (host?.includes("localhost") ? "http" : "https");

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

function normalizeSectionName(section: ReportSection): string {
  return pickFirstString(section.name, section.key, section.label, section.title).toUpperCase();
}

function deriveGamesFromSectionObject(obj: Record<string, unknown>): GamesData | undefined {
  const live = arrayifyStrings(obj.games && isObject(obj.games) ? obj.games.live : obj.live ?? obj.live_games);
  const upcoming = arrayifyStrings(
    obj.games && isObject(obj.games) ? obj.games.upcoming : obj.upcoming ?? obj.upcoming_games ?? obj.today_schedule
  );
  const final = arrayifyStrings(
    obj.games && isObject(obj.games)
      ? obj.games.final
      : obj.final ?? obj.final_scores ?? obj.recent_final_scores ?? obj.today_results
  );

  if (!live.length && !upcoming.length && !final.length) return undefined;

  return {
    live: live.length ? live : undefined,
    upcoming: upcoming.length ? upcoming : undefined,
    final: final.length ? final : undefined,
  };
}

function coerceSection(name: string, value: unknown): ReportSection | null {
  if (value === null || value === undefined) return null;

  if (!isObject(value)) {
    const text = flattenToText(value);
    if (!text) return null;

    return {
      name,
      title: formatLabel(name),
      content: text,
    };
  }

  const obj = value as Record<string, unknown>;
  const games = deriveGamesFromSectionObject(obj);

  const structuredEntries = Object.entries(obj).filter(([key]) => {
    return ![
      "name",
      "key",
      "label",
      "title",
      "headline",
      "snapshot",
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
      "advanced",
      "content",
    ].includes(key);
  });

  const structured_sections =
    structuredEntries.length > 0
      ? Object.fromEntries(structuredEntries) as JsonObject
      : undefined;

  const content =
    obj.content !== undefined
      ? (obj.content as JsonValue)
      : structuredEntries.length === 0
      ? (obj as JsonObject)
      : undefined;

  return {
    name,
    key: pickFirstString(obj.key) || name,
    label: pickFirstString(obj.label) || formatLabel(name),
    title: pickFirstString(obj.title) || formatLabel(name),
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
    content,
    structured_sections,
    advanced: isObject(obj.advanced) ? (obj.advanced as JsonObject) : undefined,
    games,
  };
}

function deriveSectionsFromRoot(data: RootReport): ReportSection[] {
  const sections: ReportSection[] = [];

  for (const sectionName of SECTION_ORDER) {
    const aliases = ROOT_SECTION_ALIASES[sectionName] || [sectionName];
    let matchedValue: unknown;

    for (const alias of aliases) {
      if (alias in data) {
        matchedValue = data[alias];
        break;
      }
    }

    const section = coerceSection(sectionName, matchedValue);
    if (section) sections.push(section);
  }

  if (sections.length > 0) return sections;

  for (const [key, value] of Object.entries(data)) {
    if (ROOT_META_KEYS.has(key)) continue;
    if (!value) continue;

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

function getRootStatCards(data: RootReport): Array<{ label: string; value: string }> {
  const cards: Array<{ label: string; value: string }> = [];

  const sectionCount =
    (Array.isArray(data.sections) ? data.sections.length : 0) || deriveSectionsFromRoot(data).length;

  if (sectionCount) cards.push({ label: "Reports", value: String(sectionCount) });

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

function looksLikeLeagueCollection(obj: Record<string, unknown>) {
  const keys = Object.keys(obj).map((k) => k.toLowerCase());
  return keys.some((key) =>
    [
      "premier league",
      "bundesliga",
      "la liga",
      "mls",
      "serie a",
      "ligue 1",
      "champions league",
      "europa league",
      "acc",
      "american",
      "big 12",
      "big ten",
      "conference usa",
      "fbs independents",
      "mac",
      "mountain west",
      "pac-12",
      "sec",
      "sun belt",
      "mlb",
      "nba",
      "nhl",
      "nfl",
      "soccer",
      "fantasy",
      "betting",
    ].includes(key)
  );
}

function looksLikeSummaryObject(obj: Record<string, unknown>) {
  const keys = Object.keys(obj).map((k) => k.toLowerCase());
  return (
    keys.includes("headline") ||
    keys.includes("notes") ||
    keys.includes("summary") ||
    keys.includes("overview") ||
    keys.includes("today_schedule") ||
    keys.includes("today_results") ||
    keys.includes("counts")
  );
}

function compactSectionTitle(title: string): string {
  if (RECENT_FINAL_KEYS.has(title)) return "Recent Finals";
  if (title === "today_schedule") return "Schedule";
  if (title === "today_results") return "Recent Results";
  if (title === "key_data_points") return "Key Points";
  if (title === "current_data_and_analytics") return "Analytics";
  if (title === "story_angles") return "Story Angles";
  if (title === "why_it_matters") return "Why It Matters";
  if (title === "historical_context") return "Context";
  return formatLabel(title);
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

function renderCompactText(text: string) {
  const paragraphs = splitParagraphs(text).slice(0, 3);
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

function renderPrimitiveStack(obj: Record<string, unknown>) {
  const entries = Object.entries(obj).filter(
    ([, value]) => flattenToText(value).trim().length > 0
  );

  if (!entries.length) return null;

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
            {compactSectionTitle(key)}
          </div>
          <div className="mt-2 text-sm leading-6 text-zinc-100 break-words whitespace-normal">
            {String(value)}
          </div>
        </div>
      ))}
    </div>
  );
}

function renderKeyValueTextRows(obj: Record<string, unknown>) {
  const entries = Object.entries(obj).filter(
    ([, value]) => flattenToText(value).trim().length > 0
  );

  if (!entries.length) return null;

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
            {compactSectionTitle(key)}
          </h4>
          {renderContent(value, 1)}
        </div>
      ))}
    </div>
  );
}

function renderFieldCards(obj: Record<string, unknown>, columns = "lg:grid-cols-2") {
  const entries = Object.entries(obj).filter(
    ([, value]) => flattenToText(value).trim().length > 0
  );

  if (!entries.length) return null;

  return (
    <div className={`grid gap-3 ${columns}`}>
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 min-w-0"
        >
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400 break-words">
            {compactSectionTitle(key)}
          </h4>
          <div className="min-w-0">{renderContent(value, 1)}</div>
        </div>
      ))}
    </div>
  );
}

function renderTeamsGrid(teams: unknown[]) {
  if (!teams.length) return null;

  return (
    <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
      {teams.map((team, index) => {
        if (!isObject(team)) {
          return (
            <div
              key={`team-${index}`}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-200 break-words"
            >
              {flattenToText(team)}
            </div>
          );
        }

        const teamName = pickFirstString(team.team, team.name) || `Team ${index + 1}`;
        const record = pickFirstString(team.record);
        const coach = pickFirstString(team.coach);
        const keyPlayers = arrayifyStrings(team.key_players);

        return (
          <div key={`${teamName}-${index}`} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <div className="text-sm font-semibold text-white break-words">{teamName}</div>
            {record ? (
              <div className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-400 break-words">
                Record: {record}
              </div>
            ) : null}
            {coach ? (
              <div className="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-400 break-words">
                Coach: {coach}
              </div>
            ) : null}
            {keyPlayers.length ? (
              <div className="mt-2 text-xs leading-5 text-zinc-300 break-words">
                Key players: {keyPlayers.join(", ")}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function renderConferenceView(conferences: Record<string, unknown>) {
  const entries = Object.entries(conferences).filter(([, value]) => isObject(value));
  if (!entries.length) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {entries.map(([conferenceName, conferenceValue]) => {
        const conf = conferenceValue as Record<string, unknown>;
        const teams = Array.isArray(conf.teams) ? conf.teams : [];
        const finals = arrayifyStrings(conf.finals);
        const live = arrayifyStrings(conf.live);
        const upcoming = arrayifyStrings(conf.upcoming);

        const headlineStats = [
          teams.length ? `${teams.length} teams` : "",
          finals.length ? `${finals.length} finals` : "0 finals",
          live.length ? `${live.length} live` : "0 live",
          upcoming.length ? `${upcoming.length} upcoming` : "0 upcoming",
        ].filter(Boolean);

        return (
          <div
            key={conferenceName}
            className="rounded-xl border border-zinc-800 bg-[#0b0b0f] p-4 min-w-0"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h4 className="text-sm font-semibold uppercase tracking-[0.16em] text-white break-words">
                {conferenceName}
              </h4>
              <div className="text-[10px] uppercase tracking-[0.16em] text-zinc-500">
                {headlineStats.join(" • ")}
              </div>
            </div>

            <div className="space-y-3">
              {teams.length > 0 ? (
                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Teams
                  </div>
                  {renderTeamsGrid(teams)}
                </div>
              ) : null}

              {live.length > 0 ? (
                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Live
                  </div>
                  {renderSimpleList(live)}
                </div>
              ) : null}

              {upcoming.length > 0 ? (
                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Upcoming
                  </div>
                  {renderSimpleList(upcoming)}
                </div>
              ) : null}

              {finals.length > 0 ? (
                <div>
                  <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Finals
                  </div>
                  {renderSimpleList(finals)}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderLeagueSummaryCards(obj: Record<string, unknown>) {
  const entries = Object.entries(obj).filter(
    ([, value]) => flattenToText(value).trim().length > 0
  );

  if (!entries.length) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className="rounded-xl border border-zinc-800 bg-[#0b0b0f] p-4 min-w-0"
        >
          <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.16em] text-white break-words">
            {compactSectionTitle(key)}
          </h4>
          {isObject(value) && looksLikeSummaryObject(value)
            ? renderKeyValueTextRows(value)
            : renderContent(value, 1)}
        </div>
      ))}
    </div>
  );
}

function renderContent(value: unknown, depth = 0): React.ReactNode {
  if (value === null || value === undefined) return null;

  if (typeof value === "string") {
    const normalized = normalizeText(value);
    const paragraphs = splitParagraphs(normalized);
    const listish = arrayifyStrings(normalized);

    if (
      listish.length >= 3 &&
      listish.length <= 20 &&
      paragraphs.length <= 2 &&
      normalized.includes("\n")
    ) {
      return renderSimpleList(listish);
    }

    return renderCompactText(normalized);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return (
      <p className="text-sm leading-6 text-zinc-200 break-words whitespace-normal">
        {String(value)}
      </p>
    );
  }

  if (Array.isArray(value)) {
    const simple = value.every(
      (item) =>
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean"
    );

    if (simple) return renderSimpleList(value.map((item) => String(item)));

    return (
      <div className="space-y-3">
        {value.map((item, index) => (
          <div key={index} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 min-w-0">
            {renderContent(item, depth + 1)}
          </div>
        ))}
      </div>
    );
  }

  if (isObject(value)) {
    if ("conferences" in value && isObject(value.conferences)) {
      return renderConferenceView(value.conferences as Record<string, unknown>);
    }

    const primitiveOnly = Object.values(value).every(
      (nested) =>
        typeof nested === "string" ||
        typeof nested === "number" ||
        typeof nested === "boolean"
    );

    if (primitiveOnly) return renderPrimitiveStack(value);

    if (looksLikeLeagueCollection(value)) return renderLeagueSummaryCards(value);

    if (looksLikeSummaryObject(value)) return renderKeyValueTextRows(value);

    if (depth === 0) return renderFieldCards(value, "lg:grid-cols-2");

    return renderKeyValueTextRows(value);
  }

  return null;
}

function SectionShell({
  title,
  children,
  compact = false,
}: {
  title: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  if (!children) return null;

  return (
    <section className={`rounded-xl border border-zinc-800 bg-[#0b0b0f] ${compact ? "p-4" : "p-5"}`}>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-white">
        {title}
      </h3>
      {children}
    </section>
  );
}

function AdvancedSection({ advanced }: { advanced: JsonObject }) {
  const entries = Object.entries(advanced).filter(
    ([key, value]) => key !== "title" && flattenToText(value).trim().length > 0
  );

  if (!entries.length) return null;

  return (
    <SectionShell title="Advanced" compact>
      <div className="grid gap-3 md:grid-cols-2">
        {entries.map(([key, value]) => (
          <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              {compactSectionTitle(key)}
            </div>
            <div className="mt-2 min-w-0">{renderContent(value, 1)}</div>
          </div>
        ))}
      </div>
    </SectionShell>
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

function hasRenderableBody(section: ReportSection): boolean {
  const games = isJsonObject(section.games) ? (section.games as GamesData) : undefined;
  const structuredSections = isJsonObject(section.structured_sections)
    ? section.structured_sections
    : undefined;
  const advanced = isJsonObject(section.advanced)
    ? section.advanced
    : undefined;

  const visibleStructuredEntries = structuredSections
    ? Object.entries(structuredSections).filter(
        ([key, value]) =>
          !["headline", "snapshot", "static_graphic"].includes(key) &&
          flattenToText(value).trim().length > 0
      )
    : [];

  return Boolean(
    arrayifyStrings(section.key_storylines).length ||
      flattenToText(section.snapshot).trim() ||
      (games &&
        (arrayifyStrings(games.live).length ||
          arrayifyStrings(games.upcoming).length ||
          arrayifyStrings(games.final).length)) ||
      visibleStructuredEntries.length ||
      (advanced &&
        Object.keys(advanced).some(
          (key) => key !== "title" && flattenToText(advanced[key]).trim()
        )) ||
      flattenToText(section.content).trim() ||
      arrayifyStrings(section.live).length ||
      arrayifyStrings(section.upcoming).length ||
      arrayifyStrings(section.final_scores).length
  );
}

function SportSectionCard({ section }: { section: ReportSection }) {
  const displayName = getSectionDisplayName(section);
  const title = pickFirstString(section.title) || displayName;
  const headline = pickFirstString(section.headline);
  const snapshot = section.snapshot;
  const keyStorylines = arrayifyStrings(section.key_storylines);
  const updatedAt = pickFirstString(section.updated_at);
  const games = isJsonObject(section.games) ? (section.games as GamesData) : undefined;
  const structuredSections = isJsonObject(section.structured_sections)
    ? section.structured_sections
    : undefined;
  const advanced = isJsonObject(section.advanced)
    ? section.advanced
    : undefined;

  const fallbackGameLive = arrayifyStrings(section.live);
  const fallbackGameUpcoming = arrayifyStrings(section.upcoming);
  const fallbackGameFinal = arrayifyStrings(section.final_scores);

  const visibleStructuredEntries = structuredSections
    ? Object.entries(structuredSections).filter(
        ([key, value]) =>
          !["headline", "snapshot", "static_graphic"].includes(key) &&
          flattenToText(value).trim().length > 0
      )
    : [];

  const prioritizedEntries = visibleStructuredEntries.filter(([key]) => COMPACT_KEYS.has(key));
  const remainingEntries = visibleStructuredEntries.filter(([key]) => !COMPACT_KEYS.has(key));

  const liveItems = arrayifyStrings(games?.live).length
    ? arrayifyStrings(games?.live)
    : fallbackGameLive;

  const upcomingItems = arrayifyStrings(games?.upcoming).length
    ? arrayifyStrings(games?.upcoming)
    : fallbackGameUpcoming;

  const finalItems = arrayifyStrings(games?.final).length
    ? arrayifyStrings(games?.final)
    : fallbackGameFinal;

  const fallbackReportDetails =
    !visibleStructuredEntries.length && flattenToText(section.content).trim()
      ? renderContent(section.content)
      : null;

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
          <SectionShell title="Snapshot" compact>
            {renderContent(snapshot)}
          </SectionShell>
        ) : null}

        {keyStorylines.length > 0 ? (
          <SectionShell title="Key Storylines" compact>
            {renderSimpleList(keyStorylines)}
          </SectionShell>
        ) : null}

        {(liveItems.length || upcomingItems.length || finalItems.length) ? (
          <div className="grid gap-3 xl:grid-cols-3">
            {liveItems.length > 0 ? (
              <SectionShell title="Live Games" compact>
                {renderSimpleList(liveItems)}
              </SectionShell>
            ) : null}

            {upcomingItems.length > 0 ? (
              <SectionShell title="Upcoming Games" compact>
                {renderSimpleList(upcomingItems)}
              </SectionShell>
            ) : null}

            {finalItems.length > 0 ? (
              <SectionShell title="Recent Finals" compact>
                {renderSimpleList(finalItems)}
              </SectionShell>
            ) : null}
          </div>
        ) : null}

        {prioritizedEntries.length > 0 ? (
          <div className="grid gap-3 lg:grid-cols-2">
            {prioritizedEntries.map(([key, value]) => (
              <SectionShell key={key} title={compactSectionTitle(key)} compact>
                {renderContent(value)}
              </SectionShell>
            ))}
          </div>
        ) : null}

        {remainingEntries.length > 0 ? (
          <div className="space-y-4">
            {remainingEntries.map(([key, value]) => (
              <SectionShell key={key} title={compactSectionTitle(key)} compact>
                {renderContent(value)}
              </SectionShell>
            ))}
          </div>
        ) : null}

        {advanced ? <AdvancedSection advanced={advanced} /> : null}

        {fallbackReportDetails ? (
          <SectionShell title="Report Details" compact>
            {fallbackReportDetails}
          </SectionShell>
        ) : null}
      </div>
    </section>
  );
}

export default async function Page() {
  const data = await loadLatestReport();
  const title = pickFirstString(data.title) || "Global Sports Report";
  const headline = pickFirstString(data.headline);
  const generatedAt = pickFirstString(
    data.generated_at,
    data.updated_at,
    data.published_at,
    data.generated_date
  );
  const sections = getSections(data);
  const topStorylines =
    arrayifyStrings(data.key_storylines).length > 0
      ? arrayifyStrings(data.key_storylines)
      : sections
          .map((section) => {
            const sectionName = getSectionDisplayName(section);
            const sectionSnapshot = pickFirstString(section.snapshot);
            const liveCount =
              arrayifyStrings(section.games?.live).length || arrayifyStrings(section.live).length;
            const upcomingCount =
              arrayifyStrings(section.games?.upcoming).length ||
              arrayifyStrings(section.upcoming).length;
            const finalCount =
              arrayifyStrings(section.games?.final).length ||
              arrayifyStrings(section.final_scores).length;

            if (liveCount || upcomingCount || finalCount) {
              return `${sectionName} shows ${liveCount} live and ${upcomingCount} upcoming on the board.`;
            }

            if (sectionSnapshot) {
              return `${sectionName} snapshot: ${sectionSnapshot}`;
            }

            return "";
          })
          .filter(Boolean)
          .slice(0, 6);

  const statCards = getRootStatCards(data);
  const disclaimer =
    pickFirstString(data.disclaimer) ||
    "This report is an automated summary intended to support, not replace, human sports journalism.";

  const renderableSections = sections.filter(hasRenderableBody);

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

              {VIDEO_URL ? (
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
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-lg border border-dashed border-zinc-700 bg-black px-6 text-center text-sm leading-6 text-zinc-400">
                  <div className="max-w-md break-words whitespace-normal">
                    Add your Yahoo Sports Network embed URL in the VIDEO_URL constant.
                  </div>
                </div>
              )}

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
                No top-level storyline data is available in the current report.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-zinc-800 bg-[#0b0b0f] p-4">
            <h2 className="mb-3 text-base font-semibold uppercase tracking-[0.16em] text-white">
              Daily Snapshot
            </h2>
            {renderContent(data.snapshot) || (
              <p className="text-sm leading-6 text-zinc-400">
                No root snapshot is available in the current report.
              </p>
            )}
          </section>
        </div>

        <div className="mt-5 space-y-4">
          {renderableSections.map((section, index) => (
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