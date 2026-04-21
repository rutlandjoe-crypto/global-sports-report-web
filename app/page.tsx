import fs from "fs";
import path from "path";
import { unstable_noStore as noStore } from "next/cache";

type Primitive = string | number | boolean | null | undefined;
type JsonValue = Primitive | JsonValue[] | { [key: string]: JsonValue };
type AnyRecord = Record<string, JsonValue>;

type ReportSection = {
  key: string;
  label: string;
  title: string;
  summary: string;
  headline: string;
  storylines: string[];
  live: string[];
  finals: string[];
  upcoming: string[];
  analytics: string[];
};

const SUBSTACK_URL_DEFAULT = "https://globalsportsreport.substack.com/";
const X_HANDLE_DEFAULT = "@GlobalSportsRep";
const YAHOO_SPORTS_URL = "https://sports.yahoo.com/watch/";

const SECTION_LABELS: Record<string, string> = {
  mlb: "MLB",
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  ncaafb: "NCAA Football",
  college_football: "NCAA Football",
  soccer: "Soccer",
  fantasy: "Fantasy",
  betting_odds: "Betting Odds",
  betting: "Betting Odds",
};

const ORDER = [
  "mlb",
  "nba",
  "nhl",
  "nfl",
  "ncaafb",
  "college_football",
  "soccer",
  "fantasy",
  "betting_odds",
  "betting",
];

const KNOWN_BLOCK_LABELS = [
  "CURRENT DATA AND ANALYTICS",
  "KEY DATA POINTS",
  "WHY IT MATTERS",
  "STORY ANGLES",
  "WATCH LIST",
  "HISTORICAL CONTEXT",
  "STATCAST SNAPSHOT",
  "STATIC GRAPHIC",
  "TODAY PLAYOFF SCHEDULE",
  "YESTERDAY PLAYOFF RESULTS",
  "TODAY PLAYOFF RESULTS",
  "PLAYOFF SCHEDULE",
  "PLAYOFF RESULTS",
  "TODAY FINAL SCORES",
  "YESTERDAY FINAL SCORES",
  "FINAL SCORES",
  "RECENT FINAL SCORES",
  "LIVE GAMES",
  "UPCOMING GAMES",
  "TODAY SCHEDULE",
  "TODAY RESULTS",
  "YESTERDAY RESULTS",
  "TODAY LIVE",
  "PLAYOFF LIVE",
  "UPCOMING",
  "LIVE",
  "HEADLINE",
  "SNAPSHOT",
  "DISCLAIMER",
  "UPDATED",
  "OUTLOOK",
];

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function safeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => safeString(item)).filter(Boolean);
}

function dedupe(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
}

function titleCase(input: string): string {
  return input.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
}

function labelForKey(key: string): string {
  return SECTION_LABELS[key] ?? titleCase(key);
}

function compact(text: string, limit = 260): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  if (cleaned.length <= limit) return cleaned;
  return `${cleaned.slice(0, limit).trimEnd().replace(/[.,;:-]+$/, "")}...`;
}

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201c/g, '"')
    .replace(/\u201d/g, '"')
    .replace(/\u2014/g, "-")
    .replace(/\u2013/g, "-")
    .replace(/\xa0/g, " ")
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€\x9d/g, '"')
    .replace(/â€”/g, "-")
    .replace(/â€“/g, "-")
    .replace(/Ã©/g, "é")
    .replace(/Ã¡/g, "á")
    .replace(/Ã³/g, "ó")
    .replace(/Ã±/g, "ñ")
    .replace(/Ã¼/g, "ü")
    .replace(/Ã¶/g, "ö")
    .replace(/Ã¨/g, "è")
    .replace(/Ã§/g, "ç")
    .replace(/Â/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanDisplayText(value: string): string {
  let text = normalizeText(value);

  text = text.replace(/^[A-Z ]+ PRO REPORT \| \d{4}-\d{2}-\d{2}\s*/i, "");
  text = text.replace(/^GLOBAL SPORTS REPORT \| \d{4}-\d{2}-\d{2}\s*/i, "");
  text = text.replace(/^HEADLINE\s+/i, "");
  text = text.replace(/^SNAPSHOT\s+/i, "");
  text = text.replace(/^KEY DATA POINTS\s*-\s*/i, "");
  text = text.replace(/^WHY IT MATTERS\s*-\s*/i, "");
  text = text.replace(/^STORY ANGLES\s*-\s*/i, "");
  text = text.replace(/^WATCH LIST\s*-\s*/i, "");
  text = text.replace(/^CURRENT DATA AND ANALYTICS\s*-\s*/i, "");
  text = text.replace(/^\-\s*/, "");
  text = text.replace(/\s{2,}/g, " ").trim();

  return text;
}

function isGarbageFragment(value: string): boolean {
  const text = cleanDisplayText(value);
  if (!text) return true;

  const lower = text.toLowerCase();

  if (
    lower === "no" ||
    lower === "today" ||
    lower === "today." ||
    lower === "games" ||
    lower === "game" ||
    lower === "headline" ||
    lower === "snapshot" ||
    lower === "updated"
  ) {
    return true;
  }

  if (KNOWN_BLOCK_LABELS.includes(text.toUpperCase())) {
    return true;
  }

  if (text.includes("PRO REPORT |")) {
    return true;
  }

  if (/^(headline|snapshot|updated|disclaimer)\b/i.test(text)) {
    return true;
  }

  return false;
}

function looksLikeScoreLine(text: string): boolean {
  const s = cleanDisplayText(text);

  if (!s || isGarbageFragment(s)) return false;
  if (/^No\b/i.test(s)) return true;
  if (/\(Final\)/i.test(s)) return true;
  if (/\bbeat\b/i.test(s)) return true;
  if (/\d+\s*-\s*\d+/.test(s)) return true;
  if (/, [A-Z][A-Za-z .'-]+ \d+/.test(s)) return true;

  return false;
}

function looksLikeLiveLine(text: string): boolean {
  const s = cleanDisplayText(text);

  if (!s || isGarbageFragment(s)) return false;
  if (/^No\b/i.test(s)) return true;
  if (/\(In Progress\)/i.test(s)) return true;
  if (/\bQuarter\b/i.test(s)) return true;
  if (/\bPeriod\b/i.test(s)) return true;
  if (/\bIn Progress\b/i.test(s)) return true;
  if (/\d+:\d+/.test(s) && /\d/.test(s)) return true;

  return false;
}

function looksLikeUpcomingLine(sectionKey: string, text: string): boolean {
  const s = cleanDisplayText(text);

  if (!s || isGarbageFragment(s)) return false;
  if (/^No\b/i.test(s)) return true;
  if (/\bat\b/i.test(s)) return true;
  if (/\bET\b/.test(s)) return true;
  if (/\bTV:\b/i.test(s)) return true;
  if (/^Round\b/i.test(s) || /^Rounds\b/i.test(s)) return true;
  if (/^Location:/i.test(s) || /^Venue\b/i.test(s)) return true;

  if (sectionKey === "nfl" || sectionKey === "ncaafb") {
    return true;
  }

  return false;
}

function looksLikeAnalyticsLine(text: string): boolean {
  const s = cleanDisplayText(text);

  if (!s || isGarbageFragment(s)) return false;
  if (s.includes("PRO REPORT |")) return false;
  if (/^(No|today\.?|games?)$/i.test(s)) return false;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return false;
  if (/^HEADLINE\b/i.test(s) || /^SNAPSHOT\b/i.test(s)) return false;

  return true;
}

function readJson(): AnyRecord {
  noStore();

  const filePath = path.join(process.cwd(), "public", "latest_report.json");

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    return isRecord(parsed) ? parsed : {};
  } catch (error) {
    console.error("Failed reading latest_report.json", error);
    return {};
  }
}

function getTimestamp(data: AnyRecord): string {
  return (
    safeString(data.updated_at) ||
    safeString(data.generated_at) ||
    safeString(data.published_at) ||
    safeString(data.timestamp) ||
    "Timestamp unavailable"
  );
}

function getSiteTitle(data: AnyRecord): string {
  const raw =
    safeString(data.title) ||
    safeString(isRecord(data.meta) ? data.meta.brand : "") ||
    "GLOBAL SPORTS REPORT";

  return raw.includes("|") ? raw.split("|")[0].trim() : raw;
}

function getSubstackUrl(data: AnyRecord): string {
  return (
    safeString(data.substack_url) ||
    safeString(isRecord(data.meta) ? data.meta.substack_url : "") ||
    SUBSTACK_URL_DEFAULT
  );
}

function getXHandle(data: AnyRecord): string {
  return (
    safeString(data.x_handle) ||
    safeString(isRecord(data.meta) ? data.meta.x_handle : "") ||
    X_HANDLE_DEFAULT
  );
}

function getXUrl(handle: string): string {
  const normalized = handle.replace(/^@/, "").trim();
  return normalized ? `https://x.com/${normalized}` : "https://x.com/GlobalSportsRep";
}

function getTopHeadline(data: AnyRecord): string {
  return compact(cleanDisplayText(safeString(data.headline)), 220);
}

function getTopSnapshot(data: AnyRecord): string {
  return compact(cleanDisplayText(safeString(data.snapshot)), 260);
}

function getTopStorylines(data: AnyRecord): string[] {
  return dedupe(safeStringArray(data.key_storylines))
    .map((item) => cleanDisplayText(item))
    .filter((item) => item && !isGarbageFragment(item))
    .slice(0, 6)
    .map((item) => compact(item, 180));
}

function extractSections(data: AnyRecord): AnyRecord[] {
  const out: AnyRecord[] = [];

  if (Array.isArray(data.sections)) {
    for (const item of data.sections) {
      if (isRecord(item)) out.push(item);
    }
    return out;
  }

  if (isRecord(data.sections)) {
    for (const [key, value] of Object.entries(data.sections)) {
      if (isRecord(value)) out.push({ key, ...value });
    }
    return out;
  }

  for (const key of Object.keys(data)) {
    if (ORDER.includes(key) && isRecord(data[key])) {
      out.push({ key, ...(data[key] as AnyRecord) });
    }
  }

  return out;
}

function splitRawBlockIntoLines(text: string): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const pieces = normalized
    .replace(/\s+\-\s+/g, "\n- ")
    .split("\n")
    .map((line) => cleanDisplayText(line))
    .filter(Boolean);

  if (pieces.length <= 1) return [cleanDisplayText(normalized)];
  return pieces
    .map((line) => (line.startsWith("- ") ? cleanDisplayText(line.slice(2)) : cleanDisplayText(line)))
    .filter(Boolean);
}

function injectBlockBreaks(content: string): string {
  let out = ` ${normalizeText(content)} `;

  for (const label of [...KNOWN_BLOCK_LABELS].sort((a, b) => b.length - a.length)) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\s${escaped}\\s`, "gi");
    out = out.replace(regex, `\n${label}\n`);
  }

  return out.replace(/\n{3,}/g, "\n\n").trim();
}

function extractBlock(content: string, labels: string[]): string {
  if (!content.trim()) return "";

  const prepared = injectBlockBreaks(content);
  const lines = prepared.split("\n").map((line) => line.trim()).filter(Boolean);
  const labelSet = new Set(KNOWN_BLOCK_LABELS);

  for (let i = 0; i < lines.length; i += 1) {
    const lineUpper = lines[i].toUpperCase();
    if (labels.includes(lineUpper)) {
      const collected: string[] = [];
      for (let j = i + 1; j < lines.length; j += 1) {
        const nextUpper = lines[j].toUpperCase();
        if (labelSet.has(nextUpper)) break;
        collected.push(lines[j]);
      }
      return collected.join("\n").trim();
    }
  }

  return "";
}

function collectFallbackList(content: string, labels: string[]): string[] {
  const block = extractBlock(content, labels);
  if (!block) return [];
  return splitRawBlockIntoLines(block).slice(0, 12);
}

function filterBucket(sectionKey: string, bucket: "live" | "finals" | "upcoming" | "analytics", items: string[]): string[] {
  const cleaned = dedupe(items.map((item) => cleanDisplayText(item)).filter(Boolean));

  return cleaned.filter((item) => {
    if (isGarbageFragment(item)) return false;

    if (bucket === "live") return looksLikeLiveLine(item);
    if (bucket === "finals") return looksLikeScoreLine(item);
    if (bucket === "upcoming") return looksLikeUpcomingLine(sectionKey, item);
    return looksLikeAnalyticsLine(item);
  });
}

function collectAnalytics(section: AnyRecord, advanced: AnyRecord, content: string): string[] {
  const primary = dedupe([
    ...safeStringArray(advanced.current_data_and_analytics),
    ...safeStringArray(advanced.key_data_points),
    ...safeStringArray(advanced.story_angles),
    ...safeStringArray(advanced.watch_list),
    ...safeStringArray(advanced.notes),
    ...safeStringArray(advanced.why_it_matters),
    cleanDisplayText(safeString(advanced.statcast_snapshot)),
    cleanDisplayText(safeString(advanced.historical_context)),
    cleanDisplayText(safeString(advanced.outlook)),
  ]).filter(Boolean);

  const filteredPrimary = filterBucket(section.key ? String(section.key) : "", "analytics", primary);
  if (filteredPrimary.length) return filteredPrimary.slice(0, 10);

  const fallback = dedupe([
    ...collectFallbackList(content, ["CURRENT DATA AND ANALYTICS"]),
    ...collectFallbackList(content, ["KEY DATA POINTS"]),
    ...collectFallbackList(content, ["WHY IT MATTERS"]),
    ...collectFallbackList(content, ["STORY ANGLES"]),
    ...collectFallbackList(content, ["WATCH LIST"]),
    cleanDisplayText(extractBlock(content, ["STATCAST SNAPSHOT"])),
    cleanDisplayText(extractBlock(content, ["HISTORICAL CONTEXT"])),
    cleanDisplayText(extractBlock(content, ["OUTLOOK"])),
  ]).filter(Boolean);

  return filterBucket(section.key ? String(section.key) : "", "analytics", fallback).slice(0, 10);
}

function buildSection(section: AnyRecord): ReportSection | null {
  const key = safeString(section.key).toLowerCase() || "section";
  const label = labelForKey(key);
  const title = safeString(section.title) || label;
  const advanced = isRecord(section.advanced) ? section.advanced : {};
  const games = isRecord(section.games) ? section.games : {};
  const content = safeString(section.content);

  const headline = compact(
    cleanDisplayText(
      safeString(section.headline) ||
        safeString(advanced.headline) ||
        extractBlock(content, ["HEADLINE"])
    ),
    220
  );

  const summary = compact(
    cleanDisplayText(
      safeString(section.snapshot) ||
        safeString(section.summary) ||
        safeString(advanced.snapshot) ||
        extractBlock(content, ["SNAPSHOT"]) ||
        safeString(section.body)
    ),
    260
  );

  const storylines = dedupe([
    ...safeStringArray(advanced.key_storylines),
    ...safeStringArray(section.storylines),
    ...safeStringArray(section.key_storylines),
  ])
    .map((item) => cleanDisplayText(item))
    .filter((item) => item && !isGarbageFragment(item))
    .map((item) => compact(item, 180))
    .slice(0, 6);

  const primaryLive = dedupe([
    ...safeStringArray(games.live),
    ...safeStringArray(advanced.live),
  ]);
  const fallbackLive =
    primaryLive.length === 0
      ? collectFallbackList(content, ["LIVE GAMES", "TODAY LIVE", "PLAYOFF LIVE", "LIVE"])
      : [];
  const live = filterBucket(key, "live", [...primaryLive, ...fallbackLive]).slice(0, 12);

  const primaryFinals = dedupe([
    ...safeStringArray(games.final),
    ...safeStringArray(advanced.final_scores),
  ]);
  const fallbackFinals =
    primaryFinals.length === 0
      ? collectFallbackList(content, [
          "FINAL SCORES",
          "TODAY FINAL SCORES",
          "YESTERDAY FINAL SCORES",
          "TODAY RESULTS",
          "YESTERDAY RESULTS",
          "PLAYOFF RESULTS",
          "YESTERDAY PLAYOFF RESULTS",
          "TODAY PLAYOFF RESULTS",
          "RECENT FINAL SCORES",
        ])
      : [];
  const finals = filterBucket(key, "finals", [...primaryFinals, ...fallbackFinals]).slice(0, 12);

  const primaryUpcoming = dedupe([
    ...safeStringArray(games.upcoming),
    ...safeStringArray(advanced.upcoming),
  ]);
  const fallbackUpcoming =
    primaryUpcoming.length === 0
      ? collectFallbackList(content, [
          "UPCOMING GAMES",
          "UPCOMING",
          "TODAY SCHEDULE",
          "TODAY PLAYOFF SCHEDULE",
          "PLAYOFF SCHEDULE",
          "DRAFT CALENDAR",
        ])
      : [];
  const upcoming = filterBucket(key, "upcoming", [...primaryUpcoming, ...fallbackUpcoming]).slice(0, 12);

  const analytics = collectAnalytics(section, advanced, content);

  const hasContent =
    !!headline ||
    !!summary ||
    storylines.length > 0 ||
    live.length > 0 ||
    finals.length > 0 ||
    upcoming.length > 0 ||
    analytics.length > 0;

  if (!hasContent) return null;

  return {
    key,
    label,
    title,
    summary,
    headline,
    storylines,
    live,
    finals,
    upcoming,
    analytics,
  };
}

function orderedSections(data: AnyRecord): ReportSection[] {
  const mapped = extractSections(data)
    .map((section) => buildSection(section))
    .filter((section): section is ReportSection => section !== null);

  const byKey = new Map<string, ReportSection>();
  for (const section of mapped) {
    if (!byKey.has(section.key)) byKey.set(section.key, section);
  }

  const ordered: ReportSection[] = [];
  for (const key of ORDER) {
    const section = byKey.get(key);
    if (section) ordered.push(section);
  }

  for (const section of mapped) {
    if (!ORDER.includes(section.key)) ordered.push(section);
  }

  return ordered;
}

function SidebarButton({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-4 text-center text-lg font-bold text-white transition hover:bg-zinc-800"
    >
      {label}
    </a>
  );
}

function CardList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (!items.length) return null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/35 p-4">
      <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
        {title}
      </h4>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={`${title}-${index}`}
            className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm leading-6 text-zinc-200"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function LeagueSection({ section }: { section: ReportSection }) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/95 p-6 shadow-xl shadow-black/30">
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500">
          {section.label}
        </p>
        <h2 className="text-2xl font-bold text-white">{section.title}</h2>
      </div>

      {section.headline ? (
        <div className="mb-4 rounded-2xl border border-zinc-800 bg-black/35 p-5">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Headline
          </h3>
          <p className="text-base leading-7 text-zinc-100">{section.headline}</p>
        </div>
      ) : null}

      {section.summary ? (
        <div className="mb-5 rounded-2xl border border-zinc-800 bg-black/35 p-5">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Snapshot
          </h3>
          <p className="text-base leading-7 text-zinc-200">{section.summary}</p>
        </div>
      ) : null}

      {section.storylines.length ? (
        <div className="mb-5 rounded-2xl border border-zinc-800 bg-black/35 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Key Storylines
          </h3>
          <div className="space-y-2">
            {section.storylines.map((item, index) => (
              <div
                key={`story-${section.key}-${index}`}
                className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm leading-6 text-zinc-200"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <CardList title="Live" items={section.live} />
        <CardList title="Final Scores" items={section.finals} />
        <CardList title="Upcoming" items={section.upcoming} />
        <CardList title="Analytics & Notes" items={section.analytics} />
      </div>
    </section>
  );
}

export default function Page() {
  const data = readJson();

  const title = getSiteTitle(data);
  const timestamp = getTimestamp(data);
  const headline = getTopHeadline(data);
  const snapshot = getTopSnapshot(data);
  const storylines = getTopStorylines(data);
  const sections = orderedSections(data);
  const substackUrl = getSubstackUrl(data);
  const xHandle = getXHandle(data);
  const xUrl = getXUrl(xHandle);

  const hero = isRecord(data.hero) ? data.hero : {};
  const heroVideo = isRecord(hero.video) ? hero.video : {};
  const yahooEmbedUrl = safeString(heroVideo.embed_url);
  const yahooWatchUrl = safeString(heroVideo.watch_url) || YAHOO_SPORTS_URL;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-zinc-800 bg-zinc-950/95 p-6 shadow-2xl shadow-black/30">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.32em] text-zinc-500">
                Automated Sports Journalism Support
              </p>

              <h1 className="text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
                {title}
              </h1>

              <p className="mt-3 text-sm uppercase tracking-[0.2em] text-zinc-400">
                Last updated: {timestamp}
              </p>

              <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
                <div className="space-y-4">
                  {headline ? (
                    <div className="rounded-2xl border border-zinc-800 bg-black/35 p-5">
                      <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        Headline
                      </h2>
                      <p className="text-lg leading-8 text-zinc-100">{headline}</p>
                    </div>
                  ) : null}

                  {snapshot ? (
                    <div className="rounded-2xl border border-zinc-800 bg-black/35 p-5">
                      <h2 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
                        Snapshot
                      </h2>
                      <p className="text-base leading-7 text-zinc-200">{snapshot}</p>
                    </div>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-zinc-800 bg-black/35 p-4">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    Yahoo Sports 24/7
                  </h2>

                  {yahooEmbedUrl ? (
                    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                      <iframe
                        src={yahooEmbedUrl}
                        title="Yahoo Sports 24/7"
                        className="h-[260px] w-full"
                        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div className="flex h-[260px] flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 text-center">
                      <p className="mb-3 text-base font-semibold text-white">
                        Open Yahoo Sports 24/7 in a new tab
                      </p>
                      <p className="mb-5 text-sm leading-6 text-zinc-400">
                        Add a real embeddable Yahoo video URL in latest_report.json to restore the live player here.
                      </p>
                      <a
                        href={yahooWatchUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-zinc-800"
                      >
                        Open Yahoo Sports
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {storylines.length ? (
              <section className="rounded-3xl border border-zinc-800 bg-zinc-950/95 p-6 shadow-xl shadow-black/30">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-zinc-400">
                  Key Storylines
                </h2>
                <div className="space-y-3">
                  {storylines.map((item, index) => (
                    <div
                      key={`top-storyline-${index}`}
                      className="rounded-2xl border border-zinc-800 bg-black/35 px-5 py-4 text-base leading-7 text-zinc-200"
                    >
                      {item}
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {sections.length ? (
              <div className="space-y-6">
                {sections.map((section) => (
                  <LeagueSection key={section.key} section={section} />
                ))}
              </div>
            ) : (
              <section className="rounded-3xl border border-zinc-800 bg-zinc-950/95 p-6 shadow-xl shadow-black/30">
                <h2 className="mb-3 text-lg font-bold text-white">
                  Awaiting structured league data
                </h2>
                <p className="text-base leading-7 text-zinc-300">
                  The page layout is ready, but the current JSON feed is not delivering usable league sections yet.
                </p>
              </section>
            )}
          </div>

          <aside>
            <div className="sticky top-6 rounded-3xl border border-zinc-800 bg-zinc-950/95 p-6 shadow-2xl shadow-black/30">
              <h2 className="mb-5 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-400">
                Follow Global Sports Report
              </h2>

              <div className="space-y-4">
                <SidebarButton href={substackUrl} label="Substack" />
                <SidebarButton href={xUrl} label="X / Twitter" />
                <SidebarButton href={yahooWatchUrl} label="Yahoo Sports 24/7 Network" />
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-800 bg-black/35 p-4">
                <p className="text-sm leading-7 text-zinc-300">
                  This report is an automated summary intended to support, not replace, human sports journalism.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}