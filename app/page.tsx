import fs from "fs/promises";
import path from "path";

type UnknownRecord = Record<string, unknown>;

type ReportData = {
  title?: string;
  headline?: string;
  body?: string;
  snapshot?: unknown;
  key_storylines?: unknown;
  generated_at?: string;
  updated_at?: string;
  published_at?: string;
  disclaimer?: string;
  x_handle?: string;
  substack_url?: string;
  global_report?: string;
  sections?: Record<string, unknown> | unknown[];
  meta?: {
    brand?: string;
    site_url?: string;
    substack_url?: string;
    x_handle?: string;
    edition_date?: string;
    generated_at?: string;
    timezone?: string;
    report_count?: number;
  };
};

type NormalizedSection = {
  key: string;
  title: string;
  updatedAt: string;
  headline: string;
  snapshot: string;
  body: string;
  content: string;
  keyDataPoints: string[];
  whyItMatters: string[];
  storyAngles: string[];
  watchList: string[];
  finalScores: string[];
  live: string[];
  upcoming: string[];
  historicalContext: string;
  statcastSnapshot: string;
  outlook: string;
  fantasyInsights: string[];
  notes: string[];
};

const FALLBACK_DATA: ReportData = {
  title: "GLOBAL SPORTS REPORT",
  headline: "Automated sports journalism support for the modern newsroom.",
  body: "The latest report feed is being prepared.",
  snapshot: "The latest report feed is being prepared.",
  key_storylines: [],
  generated_at: "Update pending",
  updated_at: "Update pending",
  published_at: "Update pending",
  disclaimer:
    "This report is an automated summary intended to support, not replace, human sports journalism.",
  x_handle: "@GlobalSportsRp",
  substack_url: "https://globalsportsreport.substack.com/",
  global_report: "",
  sections: [],
  meta: {
    brand: "Global Sports Report",
    site_url: "https://global-sports-report-web.vercel.app",
    substack_url: "https://globalsportsreport.substack.com/",
    x_handle: "@GlobalSportsRp",
    edition_date: "",
    generated_at: "Update pending",
    timezone: "America/New_York",
    report_count: 0,
  },
};

const INLINE_SECTION_LABELS = [
  "HEADLINE",
  "SNAPSHOT",
  "KEY STORYLINES",
  "KEY DATA POINTS",
  "WHY IT MATTERS",
  "STORY ANGLES",
  "WATCH LIST",
  "FINAL SCORES",
  "LIVE",
  "UPCOMING",
  "HISTORICAL CONTEXT",
  "STATCAST SNAPSHOT",
  "OUTLOOK",
  "CURRENT DATA AND ANALYTICS",
  "YESTERDAY FINAL SCORES",
  "TODAY FINAL SCORES",
  "TODAY RESULTS",
  "YESTERDAY RESULTS",
  "YESTERDAY PLAYOFF RESULTS",
  "TODAY PLAYOFF RESULTS",
  "PLAYOFF RESULTS",
  "TODAY LIVE",
  "TODAY SCHEDULE",
  "TODAY PLAYOFF SCHEDULE",
  "PLAYOFF SCHEDULE",
  "DRAFT CALENDAR",
  "TOP 10 DRAFT ORDER",
  "FULL ROUND 1 ORDER",
  "DAY 2 OPENING BOARD",
  "TEAM CAPITAL WATCH",
  "NEWS",
  "RANKINGS CONTEXT",
  "PLAYER MOVES",
  "GAMES",
  "RESULTS",
  "SCHEDULE",
];

async function getReportData(): Promise<ReportData> {
  try {
    const filePath = path.join(process.cwd(), "public", "latest_report.json");
    const file = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(file);

    return {
      ...FALLBACK_DATA,
      ...parsed,
      key_storylines: Array.isArray(parsed?.key_storylines)
        ? parsed.key_storylines
        : parsed?.key_storylines
          ? [parsed.key_storylines]
          : [],
      sections: parsed?.sections ?? [],
      meta: {
        ...FALLBACK_DATA.meta,
        ...(parsed?.meta || {}),
      },
    };
  } catch {
    return FALLBACK_DATA;
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value?: unknown): string {
  if (value === undefined || value === null) return "";

  const raw =
    typeof value === "string"
      ? value
      : typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : (() => {
            try {
              return JSON.stringify(value);
            } catch {
              return String(value);
            }
          })();

  return raw
    .replace(/\r/g, "")
    .replace(/â€™/g, "’")
    .replace(/â€œ/g, "“")
    .replace(/â€\x9d/g, "”")
    .replace(/â€/g, "”")
    .replace(/â€”/g, "—")
    .replace(/â€“/g, "–")
    .replace(/\u00a0/g, " ")
    .replace(/\t/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function compactText(value?: unknown, maxLength = 220): string {
  const cleaned = cleanText(value);
  if (!cleaned) return "";
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength).trimEnd()}...`;
}

function prettifyKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatLabel(key: string): string {
  const normalized = key.toLowerCase();
  if (normalized === "mlb") return "MLB";
  if (normalized === "nba") return "NBA";
  if (normalized === "nhl") return "NHL";
  if (normalized === "nfl") return "NFL";
  if (normalized === "ncaafb") return "NCAAFB";
  if (normalized === "soccer") return "Soccer";
  if (normalized === "betting_odds") return "Betting Odds";
  if (normalized === "fantasy") return "Fantasy";
  if (normalized === "nfl_draft_signals") return "NFL Draft Signals";
  return prettifyKey(key);
}

function normalizeKey(rawKey: string): string {
  const normalizedKey = rawKey
    .toLowerCase()
    .replace(/\.txt$/i, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (normalizedKey.includes("mlb")) return "mlb";
  if (normalizedKey.includes("nba")) return "nba";
  if (normalizedKey.includes("nhl")) return "nhl";
  if (normalizedKey.includes("ncaafb")) return "ncaafb";
  if (normalizedKey.includes("college_football")) return "ncaafb";
  if (normalizedKey.includes("nfl_draft")) return "nfl_draft_signals";
  if (normalizedKey.includes("nfl")) return "nfl";
  if (normalizedKey.includes("soccer")) return "soccer";
  if (normalizedKey.includes("betting")) return "betting_odds";
  if (normalizedKey.includes("fantasy")) return "fantasy";

  return normalizedKey || "section";
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function headingRegexSource(labels: string[]): string {
  return labels.map((label) => escapeRegex(label)).join("|");
}

function extractInlineBlock(content: string, labels: string[]): string {
  const source = cleanText(content).replace(/\n+/g, " ").trim();
  if (!source) return "";

  const labelSource = headingRegexSource(labels);
  const allLabelSource = headingRegexSource(INLINE_SECTION_LABELS);

  const regex = new RegExp(
    `(?:^|\\s)(?:${labelSource})(?:\\s*[:\\-]?\\s+)([\\s\\S]*?)(?=\\s(?:${allLabelSource})(?:\\s*[:\\-]?\\s+)|$)`,
    "i"
  );

  const match = source.match(regex);
  return cleanText(match?.[1] || "");
}

function hasInlineHeadingBlob(text: string): boolean {
  const cleaned = cleanText(text);
  if (!cleaned) return false;

  const matches =
    cleaned.match(
      /\b(HEADLINE|SNAPSHOT|KEY DATA POINTS|WHY IT MATTERS|STORY ANGLES|WATCH LIST|FINAL SCORES|LIVE|UPCOMING|HISTORICAL CONTEXT|STATCAST SNAPSHOT|OUTLOOK|CURRENT DATA AND ANALYTICS)\b/g
    ) || [];

  return matches.length >= 2;
}

function isSectionLabelLine(line: string): boolean {
  const s = cleanText(line).replace(/^•\s*/, "").replace(/^-\s*/, "").trim();

  return /^(HEADLINE|SNAPSHOT|KEY STORYLINES|KEY DATA POINTS|WHY IT MATTERS|STORY ANGLES|WATCH LIST|FINAL SCORES|LIVE|UPCOMING|HISTORICAL CONTEXT|STATCAST SNAPSHOT|OUTLOOK|CURRENT DATA AND ANALYTICS|GAMES|RESULTS|SCHEDULE|NEWS|RANKINGS CONTEXT|PLAYER MOVES)$/i.test(
    s
  );
}

function isRawReportTitleLine(line: string): boolean {
  const s = cleanText(line);
  return /^(MLB|NBA|NHL|NFL|NCAAFB|SOCCER|FANTASY|BETTING ODDS|NFL DRAFT SIGNALS).{0,40}REPORT\s*\|/i.test(
    s
  );
}

function isLeaguePrefixedBlob(line: string): boolean {
  const s = cleanText(line);
  return /^(MLB|NBA|NHL|NFL|NCAAFB|SOCCER|FANTASY|BETTING ODDS)\s*:\s*.+\b(MLB|NBA|NHL|NFL|NCAAFB|SOCCER|FANTASY|BETTING ODDS)\s*:/i.test(
    s
  );
}

function isProbablyNoise(item: string): boolean {
  const s = cleanText(item);
  if (!s) return true;

  if (/^Saved:/i.test(s)) return true;
  if (/^Generated:/i.test(s)) return true;
  if (/^UPDATED$/i.test(s)) return true;
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\s+[AP]M\s+ET$/i.test(s)) return true;
  if (s === FALLBACK_DATA.disclaimer) return true;
  if (isSectionLabelLine(s)) return true;
  if (isRawReportTitleLine(s)) return true;
  if (
    /^(HEADLINE|SNAPSHOT|KEY STORYLINES|KEY DATA POINTS|WHY IT MATTERS|STORY ANGLES|WATCH LIST|FINAL SCORES|LIVE|UPCOMING|HISTORICAL CONTEXT|STATCAST SNAPSHOT|OUTLOOK|CURRENT DATA AND ANALYTICS)$/i.test(
      s
    )
  ) {
    return true;
  }

  return false;
}

function splitFantasyBlob(text: string): string[] {
  const cleaned = cleanText(text);
  if (!cleaned) return [];

  const leagueMatches = cleaned.match(/\b(MLB|NBA|NHL|NFL)\s*:/g) || [];
  if (leagueMatches.length < 2) return [cleaned];

  const parts = cleaned
    .split(/(?=\b(?:MLB|NBA|NHL|NFL)\s*:)/g)
    .map((part) => cleanText(part))
    .filter(Boolean)
    .filter((part) => !isProbablyNoise(part))
    .filter((part) => !hasInlineHeadingBlob(part));

  return parts.length > 0 ? parts : [cleaned];
}

function mergeScheduleLines(lines: string[]): string[] {
  const merged: string[] = [];

  for (const rawLine of lines) {
    const line = cleanText(rawLine);
    if (!line) continue;

    const isContinuation =
      /^(?:\d{1,2}:\d{2}\s*[AP]M\s*ET\b|Probables:\b|Odds:\b|Spread:\b|Total:\b|Moneyline:\b|TV:\b|Streaming:\b)/i.test(
        line
      ) ||
      /^\|\s*/.test(line);

    if (isContinuation && merged.length > 0) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} — ${line.replace(/^\|\s*/, "")}`;
      continue;
    }

    merged.push(line);
  }

  return merged;
}

function sanitizeLineItems(lines: string[]): string[] {
  const cleanedLines = lines
    .map((line) => cleanText(line).replace(/^•\s*/, "").replace(/^- /, "").trim())
    .filter(Boolean)
    .filter((line) => !isProbablyNoise(line))
    .filter((line) => !hasInlineHeadingBlob(line))
    .filter((line) => !isSectionLabelLine(line))
    .filter((line) => !isRawReportTitleLine(line));

  return mergeScheduleLines(cleanedLines);
}

function flattenStrings(value: unknown, formatter?: (item: unknown) => string): string[] {
  if (value === undefined || value === null) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenStrings(item, formatter));
  }

  if (typeof value === "string") {
    const text = cleanText(value);

    if (!text) return [];
    if (hasInlineHeadingBlob(text)) return [];

    if (isLeaguePrefixedBlob(text)) {
      return sanitizeLineItems(splitFantasyBlob(text));
    }

    return sanitizeLineItems(text.split(/\n+/));
  }

  if (formatter) {
    const formatted = cleanText(formatter(value));
    if (!formatted) return [];
    if (isProbablyNoise(formatted)) return [];
    if (hasInlineHeadingBlob(formatted)) return [];
    if (isSectionLabelLine(formatted)) return [];
    if (isRawReportTitleLine(formatted)) return [];
    return [formatted];
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return [String(value)];
  }

  const cleaned = cleanText(value);
  if (!cleaned) return [];
  if (isProbablyNoise(cleaned)) return [];
  if (hasInlineHeadingBlob(cleaned)) return [];
  if (isSectionLabelLine(cleaned)) return [];
  if (isRawReportTitleLine(cleaned)) return [];

  return [cleaned];
}

function dedupeAndLimit(items: string[], limit: number): string[] {
  const seen = new Set<string>();
  const output: string[] = [];

  for (const raw of items) {
    const cleaned = cleanText(raw).replace(/^•\s*/, "").replace(/^- /, "").trim();
    if (!cleaned) continue;
    if (isProbablyNoise(cleaned)) continue;
    if (hasInlineHeadingBlob(cleaned)) continue;
    if (isSectionLabelLine(cleaned)) continue;
    if (isRawReportTitleLine(cleaned)) continue;
    if (seen.has(cleaned)) continue;

    seen.add(cleaned);
    output.push(cleaned);

    if (output.length >= limit) break;
  }

  return output;
}

function formatSnapshot(value: unknown): string {
  if (!value) return "";

  if (typeof value === "string") return cleanText(value);

  if (!isRecord(value)) return cleanText(value);

  const preferredOrder = [
    "total_games",
    "total_matches",
    "games",
    "matches",
    "final",
    "live",
    "upcoming",
  ];

  const parts: string[] = [];

  for (const key of preferredOrder) {
    const raw = value[key];
    if (
      raw !== undefined &&
      raw !== null &&
      raw !== "" &&
      (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean")
    ) {
      parts.push(`${prettifyKey(key)}: ${cleanText(raw)}`);
    }
  }

  if (parts.length > 0) return parts.join(" · ");

  return Object.entries(value)
    .filter(([, v]) => typeof v === "string" || typeof v === "number" || typeof v === "boolean")
    .map(([k, v]) => `${prettifyKey(k)}: ${cleanText(v)}`)
    .join(" · ");
}

function formatGameItem(item: unknown): string {
  if (!item) return "";
  if (typeof item === "string") return cleanText(item);
  if (!isRecord(item)) return cleanText(item);

  const away = cleanText(item.away || item.away_team || item.visitor || item.team1);
  const home = cleanText(item.home || item.home_team || item.host || item.team2);
  const awayScore = cleanText(item.away_score || item.visitor_score);
  const homeScore = cleanText(item.home_score || item.host_score);
  const status = cleanText(item.status);
  const inning = cleanText(item.inning);
  const quarter = cleanText(item.quarter);
  const period = cleanText(item.period);
  const time = cleanText(item.time || item.start_time || item.kickoff || item.puck_drop);
  const note = cleanText(item.note || item.summary);
  const probables = cleanText(item.probables);

  if (away && home && awayScore && homeScore) {
    const liveStatus = inning || quarter || period || status;
    return `${away} ${awayScore}, ${home} ${homeScore}${liveStatus ? ` (${liveStatus})` : ""}`;
  }

  if (away && home && time) {
    const extra = [status, probables ? `Probables: ${probables}` : ""].filter(Boolean).join(" | ");
    return `${away} at ${home} — ${time}${extra ? ` | ${extra}` : ""}`;
  }

  if (away && home) {
    const extra = [status, probables ? `Probables: ${probables}` : ""].filter(Boolean).join(" | ");
    return `${away} at ${home}${extra ? ` — ${extra}` : ""}`;
  }

  if (note) return note;

  return Object.values(item)
    .map((value) => cleanText(value))
    .filter(Boolean)
    .join(" · ");
}

function formatOddsItem(item: unknown): string {
  if (!item) return "";
  if (typeof item === "string") return cleanText(item);
  if (!isRecord(item)) return cleanText(item);

  const event = cleanText(item.event || item.game || item.matchup);
  const spread = cleanText(item.spread);
  const total = cleanText(item.total);
  const moneyline = cleanText(item.moneyline);

  const parts = [event, spread, total, moneyline].filter(Boolean);
  if (parts.length > 0) return parts.join(" · ");

  return Object.values(item)
    .map((value) => cleanText(value))
    .filter(Boolean)
    .join(" · ");
}

function splitContentBlocks(text: string): string[] {
  return sanitizeLineItems(cleanText(text).split(/\n+/)).filter(
    (line) => !hasInlineHeadingBlob(line)
  );
}

function extractLeadFromContent(content: string): string {
  const directHeadline = extractInlineBlock(content, ["HEADLINE"]);
  if (directHeadline) return directHeadline;

  const directSnapshot = extractInlineBlock(content, ["SNAPSHOT"]);
  if (directSnapshot) return directSnapshot;

  const blocks = splitContentBlocks(content);
  const candidate = blocks.find(
    (line) =>
      line.length > 35 &&
      !/^(mlb|nba|nhl|nfl|ncaafb|soccer|betting odds|fantasy)(\s|:|$)/i.test(line) &&
      !/^\d{4}-\d{2}-\d{2}/.test(line)
  );
  return candidate || "";
}

function getBestSectionText(
  primary: unknown,
  secondary: unknown,
  content: string,
  inlineLabels: string[],
  maxLength = 500
): string {
  const first = cleanText(primary);
  if (
    first &&
    !hasInlineHeadingBlob(first) &&
    !isSectionLabelLine(first) &&
    !isRawReportTitleLine(first)
  ) {
    return compactText(first, maxLength);
  }

  const second = cleanText(secondary);
  if (
    second &&
    !hasInlineHeadingBlob(second) &&
    !isSectionLabelLine(second) &&
    !isRawReportTitleLine(second)
  ) {
    return compactText(second, maxLength);
  }

  const inline = extractInlineBlock(content, inlineLabels);
  if (inline && !isRawReportTitleLine(inline)) return compactText(inline, maxLength);

  return "";
}

function getBestList(
  primary: unknown,
  secondary: unknown,
  tertiary: unknown,
  content: string,
  inlineLabels: string[],
  limit = 8,
  formatter?: (item: unknown) => string
): string[] {
  const items = [
    ...flattenStrings(primary, formatter),
    ...flattenStrings(secondary, formatter),
    ...flattenStrings(tertiary, formatter),
  ];

  const cleanItems = dedupeAndLimit(items, limit);
  if (cleanItems.length > 0) return cleanItems;

  const inline = extractInlineBlock(content, inlineLabels);
  if (!inline) return [];

  const inlineItems = sanitizeLineItems(
    inline
      .split(/\s*-\s+/)
      .flatMap((chunk) => chunk.split(/\n+/))
  );

  return dedupeAndLimit(inlineItems, limit);
}

function normalizeSection(sectionKey: string, rawSection: unknown): NormalizedSection {
  const section = isRecord(rawSection) ? rawSection : {};
  const advanced = isRecord(section.advanced) ? section.advanced : {};
  const analytics = isRecord(section.analytics) ? section.analytics : {};
  const games = isRecord(section.games) ? section.games : {};

  const content = cleanText(section.content);
  const extractedLead = extractLeadFromContent(content);

  const title = cleanText(section.title) || formatLabel(sectionKey);

  const headline =
    getBestSectionText(section.headline, advanced.headline, content, ["HEADLINE"], 260) ||
    extractedLead;

  const snapshot =
    formatSnapshot(section.snapshot) ||
    formatSnapshot(advanced.snapshot) ||
    getBestSectionText(section.snapshot, advanced.snapshot, content, ["SNAPSHOT", "GLOBAL SNAPSHOT"], 420) ||
    headline ||
    extractedLead;

  const body =
    getBestSectionText(section.body, "", content, ["HEADLINE", "SNAPSHOT", "CURRENT DATA AND ANALYTICS"], 1800) ||
    snapshot ||
    extractedLead;

  const keyDataPoints = getBestList(
    advanced.key_data_points,
    section.key_data_points,
    analytics.key_data_points,
    content,
    ["KEY DATA POINTS"],
    8
  );

  const whyItMatters = getBestList(
    advanced.why_it_matters,
    section.why_it_matters,
    undefined,
    content,
    ["WHY IT MATTERS"],
    6
  );

  const storyAngles = getBestList(
    advanced.story_angles,
    section.story_angles,
    section.key_storylines,
    content,
    ["STORY ANGLES", "KEY STORYLINES"],
    6
  );

  const watchList = getBestList(
    advanced.watch_list,
    section.watch_list,
    undefined,
    content,
    ["WATCH LIST", "TEAM CAPITAL WATCH", "TOP 10 DRAFT ORDER", "FULL ROUND 1 ORDER", "DAY 2 OPENING BOARD"],
    6
  );

  const finalScores = getBestList(
    advanced.final_scores,
    games.final,
    section.final_scores || section.results,
    content,
    [
      "FINAL SCORES",
      "TODAY FINAL SCORES",
      "YESTERDAY FINAL SCORES",
      "TODAY RESULTS",
      "YESTERDAY PLAYOFF RESULTS",
      "TODAY PLAYOFF RESULTS",
      "PLAYOFF RESULTS",
    ],
    10,
    formatGameItem
  );

  const live = getBestList(
    advanced.live,
    games.live,
    section.live,
    content,
    ["LIVE", "TODAY LIVE"],
    10,
    formatGameItem
  );

  const upcoming = getBestList(
    advanced.upcoming,
    games.upcoming,
    section.upcoming || section.schedule || section.odds,
    content,
    ["UPCOMING", "TODAY SCHEDULE", "TODAY PLAYOFF SCHEDULE", "PLAYOFF SCHEDULE", "DRAFT CALENDAR"],
    10,
    (item) => {
      const gameFormatted = formatGameItem(item);
      if (gameFormatted) return gameFormatted;
      return formatOddsItem(item);
    }
  );

  const fantasyInsights = getBestList(
    section.fantasy_insights || section.insights,
    advanced.notes,
    undefined,
    content,
    ["PLAYER MOVES", "RANKINGS CONTEXT", "NEWS"],
    8
  );

  const notes = getBestList(
    section.notes,
    advanced.notes || advanced.current_data_and_analytics,
    section.bullets,
    content,
    ["CURRENT DATA AND ANALYTICS", "NEWS", "RANKINGS CONTEXT", "PLAYER MOVES"],
    8
  );

  const historicalContext = getBestSectionText(
    advanced.historical_context,
    section.historical_context,
    content,
    ["HISTORICAL CONTEXT"],
    500
  );

  const statcastSnapshot = getBestSectionText(
    advanced.statcast_snapshot,
    section.statcast_snapshot,
    content,
    ["STATCAST SNAPSHOT"],
    500
  );

  const outlook = getBestSectionText(
    advanced.outlook,
    section.outlook,
    content,
    ["OUTLOOK"],
    500
  );

  return {
    key: sectionKey,
    title,
    updatedAt: cleanText(section.updated_at),
    headline,
    snapshot,
    body,
    content,
    keyDataPoints,
    whyItMatters,
    storyAngles,
    watchList,
    finalScores,
    live,
    upcoming,
    historicalContext,
    statcastSnapshot,
    outlook,
    fantasyInsights,
    notes,
  };
}

function normalizeSections(
  sections: ReportData["sections"]
): Record<string, UnknownRecord> {
  if (!sections) return {};

  if (Array.isArray(sections)) {
    const mapped: Record<string, UnknownRecord> = {};

    for (const item of sections) {
      if (!isRecord(item)) continue;

      const fallbackKey = `section_${Object.keys(mapped).length + 1}`;
      const rawKey =
        cleanText(item.key) ||
        cleanText(item.title) ||
        cleanText(item.source_file) ||
        fallbackKey;

      let key = normalizeKey(rawKey);

      if (key === "section" && !mapped[fallbackKey]) {
        key = fallbackKey;
      }

      if (mapped[key]) {
        key = `${key}_${Object.keys(mapped).length + 1}`;
      }

      mapped[key] = item;
    }

    return mapped;
  }

  if (isRecord(sections)) {
    const mapped: Record<string, UnknownRecord> = {};
    Object.entries(sections).forEach(([key, value], index) => {
      const normalizedKey = normalizeKey(key) || `section_${index + 1}`;
      mapped[normalizedKey] = isRecord(value) ? value : {};
    });
    return mapped;
  }

  return {};
}

function getPrimaryLeagueCards(
  sections: Record<string, UnknownRecord>
): { key: string; label: string; data?: UnknownRecord }[] {
  return [
    { key: "mlb", label: "MLB", data: sections.mlb },
    { key: "nba", label: "NBA", data: sections.nba },
    { key: "nhl", label: "NHL", data: sections.nhl },
    { key: "nfl", label: "NFL", data: sections.nfl },
    { key: "ncaafb", label: "NCAAFB", data: sections.ncaafb },
    { key: "soccer", label: "Soccer", data: sections.soccer },
    { key: "betting_odds", label: "Betting Odds", data: sections.betting_odds },
    { key: "fantasy", label: "Fantasy", data: sections.fantasy },
  ];
}

function getAdditionalCards(
  sections: Record<string, UnknownRecord>
): { key: string; label: string; data?: UnknownRecord }[] {
  const primaryKeys = new Set([
    "mlb",
    "nba",
    "nhl",
    "nfl",
    "ncaafb",
    "soccer",
    "betting_odds",
    "fantasy",
  ]);

  return Object.entries(sections)
    .filter(([key, value]) => !primaryKeys.has(key) && isRecord(value))
    .map(([key, value]) => ({
      key,
      label: formatLabel(key),
      data: value,
    }));
}

function stripLeadingLeaguePrefix(text: string): string {
  return cleanText(text).replace(
    /^(MLB|NBA|NHL|NFL|NCAAFB|SOCCER|FANTASY|BETTING ODDS|NFL DRAFT SIGNALS)\s*:\s*/i,
    ""
  );
}

function getCleanLeadText(normalized: NormalizedSection): string {
  const candidates = [normalized.snapshot, normalized.body, normalized.headline];

  for (const candidate of candidates) {
    const cleaned = stripLeadingLeaguePrefix(candidate);
    if (!cleaned) continue;
    if (hasInlineHeadingBlob(cleaned)) continue;
    if (isSectionLabelLine(cleaned)) continue;
    if (isRawReportTitleLine(cleaned)) continue;
    return cleaned;
  }

  return "";
}

function buildLeadSnapshot(
  normalizedSections: NormalizedSection[],
  fallbackBody: string,
  fallbackHeadline: string
): string {
  const cleanSectionLeads = dedupeAndLimit(
    normalizedSections
      .map((section) => {
        const lead = getCleanLeadText(section);
        if (!lead) return "";
        return `${section.title}: ${lead}`;
      })
      .filter(Boolean),
    4
  );

  if (cleanSectionLeads.length > 0) {
    return cleanSectionLeads.join(" ");
  }

  const safeBody = cleanText(fallbackBody);
  if (
    safeBody &&
    !hasInlineHeadingBlob(safeBody) &&
    !isRawReportTitleLine(safeBody)
  ) {
    return safeBody;
  }

  const safeHeadline = cleanText(fallbackHeadline);
  if (
    safeHeadline &&
    !hasInlineHeadingBlob(safeHeadline) &&
    !isRawReportTitleLine(safeHeadline)
  ) {
    return safeHeadline;
  }

  return "The latest cross-league newsroom snapshot is being prepared.";
}

function buildEditorialNote(
  normalizedSections: NormalizedSection[],
  fallbackBody: string
): string {
  const safeBody = cleanText(fallbackBody);
  if (
    safeBody &&
    !hasInlineHeadingBlob(safeBody) &&
    !isRawReportTitleLine(safeBody) &&
    !isLeaguePrefixedBlob(safeBody)
  ) {
    return safeBody;
  }

  const notes = dedupeAndLimit(
    normalizedSections
      .map((section) => getCleanLeadText(section))
      .filter(Boolean),
    3
  );

  if (notes.length > 0) {
    return notes.join(" ");
  }

  return "League reports, scores, analytics, and supporting context will populate here as the latest report feed updates.";
}

function buildGlobalStorylines(
  rawKeyStorylines: string[],
  normalizedSections: NormalizedSection[]
): string[] {
  const direct = dedupeAndLimit(
    rawKeyStorylines.filter(
      (item) =>
        !hasInlineHeadingBlob(item) &&
        !isRawReportTitleLine(item) &&
        !isSectionLabelLine(item)
    ),
    8
  );
  if (direct.length > 0) return direct;

  return dedupeAndLimit(
    normalizedSections
      .flatMap((section) => [
        ...section.keyDataPoints.slice(0, 2),
        ...section.whyItMatters.slice(0, 1),
        ...section.storyAngles.slice(0, 1),
      ])
      .filter(Boolean),
    8
  );
}

function buildDeskItems(normalizedSections: NormalizedSection[]): {
  finals: string[];
  live: string[];
  upcoming: string[];
} {
  return {
    finals: dedupeAndLimit(
      normalizedSections.flatMap((section) => section.finalScores),
      4
    ),
    live: dedupeAndLimit(
      normalizedSections.flatMap((section) => section.live),
      4
    ),
    upcoming: dedupeAndLimit(
      normalizedSections.flatMap((section) => section.upcoming),
      4
    ),
  };
}

function isAnalyticsSafeText(text: string): boolean {
  const cleaned = cleanText(text);
  if (!cleaned) return false;
  if (hasInlineHeadingBlob(cleaned)) return false;
  if (isRawReportTitleLine(cleaned)) return false;
  if (isSectionLabelLine(cleaned)) return false;
  if (cleaned.length > 420) return false;
  return true;
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
      <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold leading-6 text-white sm:text-base">
        {value}
      </div>
    </div>
  );
}

function SectionList({
  title,
  items,
  limit = 4,
}: {
  title: string;
  items: string[];
  limit?: number;
}) {
  const cleaned = dedupeAndLimit(items, limit).filter(
    (item) =>
      !hasInlineHeadingBlob(item) &&
      !isSectionLabelLine(item) &&
      !isRawReportTitleLine(item)
  );

  if (cleaned.length === 0) return null;
  if (cleaned.length === 1 && cleaned[0].startsWith("No ")) return null;

  return (
    <div className="mt-4 border-t border-zinc-800 pt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {title}
      </p>
      <ul className="space-y-2">
        {cleaned.map((item, index) => (
          <li key={`${title}-${index}`} className="text-sm leading-6 text-zinc-300">
            • {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LeagueCard({
  title,
  sectionKey,
  section,
}: {
  title: string;
  sectionKey: string;
  section?: UnknownRecord;
}) {
  if (!section) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <span className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-400">
            Pending
          </span>
        </div>
        <p className="text-sm leading-7 text-zinc-400">
          No section data is available for this category in the current report feed.
        </p>
      </div>
    );
  }

  const normalized = normalizeSection(sectionKey, section);
  const leadText =
    getCleanLeadText(normalized) || "Live data available. See sections below.";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {normalized.updatedAt ? (
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
              {normalized.updatedAt}
            </p>
          ) : null}
        </div>
        <span className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-400">
          Live Feed
        </span>
      </div>

      <p className="text-sm leading-7 text-zinc-300">{leadText}</p>

      {normalized.notes.length > 0 && (
        <SectionList title="Report Notes" items={normalized.notes} limit={5} />
      )}

      <SectionList title="Key Data Points" items={normalized.keyDataPoints} limit={4} />
      <SectionList title="Why It Matters" items={normalized.whyItMatters} limit={3} />
      <SectionList title="Story Angles" items={normalized.storyAngles} limit={3} />
      <SectionList title="Watch List" items={normalized.watchList} limit={3} />
      <SectionList title="Live" items={normalized.live} limit={5} />
      <SectionList title="Final Scores" items={normalized.finalScores} limit={6} />
      <SectionList title="Upcoming" items={normalized.upcoming} limit={6} />
      <SectionList title="Fantasy Insights" items={normalized.fantasyInsights} limit={4} />

      {normalized.statcastSnapshot ? (
        <div className="mt-4 border-t border-zinc-800 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Statcast Snapshot
          </p>
          <p className="text-sm leading-7 text-zinc-300">
            {normalized.statcastSnapshot}
          </p>
        </div>
      ) : null}

      {normalized.historicalContext ? (
        <div className="mt-4 border-t border-zinc-800 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Historical Context
          </p>
          <p className="text-sm leading-7 text-zinc-300">
            {normalized.historicalContext}
          </p>
        </div>
      ) : null}

      {normalized.outlook ? (
        <div className="mt-4 border-t border-zinc-800 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Outlook
          </p>
          <p className="text-sm leading-7 text-zinc-300">{normalized.outlook}</p>
        </div>
      ) : null}
    </div>
  );
}

function AnalyticsDesk({
  sections,
}: {
  sections: Record<string, UnknownRecord>;
}) {
  const items: { title: string; text: string }[] = [];

  Object.entries(sections).forEach(([leagueKey, section]) => {
    const normalized = normalizeSection(leagueKey, section);

    const pushGroup = (label: string, values?: string[], limit = 2) => {
      (values || []).slice(0, limit).forEach((value) => {
        const cleaned = cleanText(value);
        if (!isAnalyticsSafeText(cleaned)) return;

        items.push({
          title: `${formatLabel(leagueKey)} · ${label}`,
          text: cleaned,
        });
      });
    };

    pushGroup("Key Data Points", normalized.keyDataPoints, 2);
    pushGroup("Why It Matters", normalized.whyItMatters, 2);
    pushGroup("Story Angles", normalized.storyAngles, 2);
    pushGroup("Watch List", normalized.watchList, 2);
    pushGroup("Fantasy Insights", normalized.fantasyInsights, 2);

    if (isAnalyticsSafeText(normalized.historicalContext)) {
      items.push({
        title: `${formatLabel(leagueKey)} · Historical Context`,
        text: normalized.historicalContext,
      });
    }

    if (isAnalyticsSafeText(normalized.statcastSnapshot)) {
      items.push({
        title: `${formatLabel(leagueKey)} · Statcast Snapshot`,
        text: normalized.statcastSnapshot,
      });
    }

    if (isAnalyticsSafeText(normalized.outlook)) {
      items.push({
        title: `${formatLabel(leagueKey)} · Outlook`,
        text: normalized.outlook,
      });
    }
  });

  const trimmed = items.slice(0, 12);

  if (trimmed.length === 0) {
    return (
      <p className="text-sm leading-7 text-zinc-400">
        Historical context, matchup signals, Statcast notes, betting context, fantasy angles, and draft analysis will populate here when the report feed includes them.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {trimmed.map((item, index) => (
        <div
          key={`${item.title}-${index}`}
          className="rounded-2xl border border-zinc-800 bg-black/40 p-4"
        >
          <div className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">
            {item.title}
          </div>
          <p className="mt-2 text-sm leading-7 text-zinc-300">{item.text}</p>
        </div>
      ))}
    </div>
  );
}

function FullReportFeed({
  headline,
  body,
  keyStorylines,
  globalReport,
}: {
  headline: string;
  body: string;
  keyStorylines: string[];
  globalReport: string;
}) {
  const cleanedGlobal = cleanText(globalReport);

  if (cleanedGlobal) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-black/40 p-5">
        <pre className="whitespace-pre-wrap break-words text-sm leading-7 text-zinc-300">
          {cleanedGlobal}
        </pre>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/40 p-5">
      <p className="text-base font-semibold text-white">{headline}</p>

      {body ? <p className="mt-4 text-sm leading-7 text-zinc-300">{body}</p> : null}

      {keyStorylines.length > 0 ? (
        <div className="mt-4 space-y-3">
          {keyStorylines.map((item, index) => (
            <p key={index} className="text-sm leading-7 text-zinc-300">
              {item}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-7 text-zinc-400">
          No report body is currently available.
        </p>
      )}
    </div>
  );
}

function SnapshotColumn({
  title,
  badge,
  items,
  emptyText,
}: {
  title: string;
  badge: string;
  items: string[];
  emptyText: string;
}) {
  const cleaned = dedupeAndLimit(items, 4);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/40 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
          {title}
        </div>
        <span className="rounded-full border border-zinc-700 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-500">
          {badge}
        </span>
      </div>

      {cleaned.length > 0 ? (
        <div className="space-y-2">
          {cleaned.map((item, index) => (
            <div key={`${title}-${index}`} className="text-sm leading-6 text-zinc-300">
              • {item}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-zinc-500">{emptyText}</p>
      )}
    </div>
  );
}

export default async function HomePage() {
  const data = await getReportData();
  const sections = normalizeSections(data.sections);
  const primaryLeagueCards = getPrimaryLeagueCards(sections);
  const additionalCards = getAdditionalCards(sections);

  const normalizedPrimarySections = primaryLeagueCards
    .filter((card): card is { key: string; label: string; data: UnknownRecord } => Boolean(card.data))
    .map((card) => ({
      key: card.key,
      label: card.label,
      normalized: normalizeSection(card.key, card.data),
    }));

  const title = cleanText(data.title) || "GLOBAL SPORTS REPORT";
  const rawHeadline =
    cleanText(data.headline) ||
    "Automated sports journalism support for the modern newsroom.";
  const rawBody =
    cleanText(data.body) || "The latest report feed is being prepared.";
  const rawKeyStorylines = dedupeAndLimit(flattenStrings(data.key_storylines), 12);

  const headline =
    !hasInlineHeadingBlob(rawHeadline) &&
    !isRawReportTitleLine(rawHeadline) &&
    rawHeadline
      ? rawHeadline
      : "Automated sports journalism support for the modern newsroom.";

  const body = buildEditorialNote(
    normalizedPrimarySections.map((item) => item.normalized),
    rawBody
  );

  const keyStorylines = buildGlobalStorylines(
    rawKeyStorylines,
    normalizedPrimarySections.map((item) => item.normalized)
  );

  const snapshot =
    (!hasInlineHeadingBlob(cleanText(data.snapshot)) &&
    !isRawReportTitleLine(cleanText(data.snapshot))
      ? formatSnapshot(data.snapshot) || cleanText(data.snapshot)
      : "") ||
    buildLeadSnapshot(
      normalizedPrimarySections.map((item) => item.normalized),
      rawBody,
      headline
    );

  const updatedAt =
    cleanText(data.updated_at || data.meta?.generated_at) || "Update pending";
  const publishedAt = cleanText(data.published_at) || updatedAt;
  const disclaimer =
    cleanText(data.disclaimer) ||
    "This report is an automated summary intended to support, not replace, human sports journalism.";
  const substackUrl =
    cleanText(data.substack_url || data.meta?.substack_url) ||
    "https://globalsportsreport.substack.com/";
  const xHandle =
    cleanText(data.x_handle || data.meta?.x_handle) || "@GlobalSportsRp";
  const xUrl = `https://x.com/${xHandle.replace("@", "")}`;
  const globalReport = cleanText(data.global_report);
  const coverageCount = String(
    data.meta?.report_count ?? Object.keys(sections).length ?? 0
  );

  const coverageLabels = primaryLeagueCards
    .filter((card) => card.data)
    .map((card) => card.label);

  const deskItems = buildDeskItems(
    normalizedPrimarySections.map((item) => item.normalized)
  );

  const quickStatsItems = dedupeAndLimit(
    [
      ...deskItems.finals,
      ...deskItems.live,
      ...deskItems.upcoming,
      ...keyStorylines,
    ],
    5
  );

  const stats = [
    { label: "Updated", value: updatedAt },
    { label: "Published", value: publishedAt },
    {
      label: "Coverage",
      value:
        coverageLabels.length > 0
          ? coverageLabels.join(" · ")
          : "MLB · NBA · NHL · NFL · NCAAFB · Soccer · Betting Odds · Fantasy",
    },
    {
      label: "Reports",
      value: coverageCount,
    },
  ];

  return (
    <main className="min-h-screen bg-black text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-2xl shadow-black/30">
          <div className="grid items-start gap-8 lg:grid-cols-[1.5fr_0.9fr]">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full border border-zinc-700 px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-zinc-400">
                Global Sports Report
              </div>

              <h1 className="max-w-4xl text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                {title}
              </h1>

              <p className="mt-4 max-w-3xl text-lg leading-8 text-zinc-300">
                {headline}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={substackUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-orange-500 bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                >
                  Substack
                </a>
                <a
                  href={xUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-900"
                >
                  X / Twitter
                </a>
                <a
                  href="/latest_report.txt"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-900"
                >
                  Full Report Feed
                </a>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {stats.map((stat) => (
                  <QuickStat key={stat.label} label={stat.label} value={stat.value} />
                ))}
              </div>
            </div>

            <aside className="rounded-2xl border border-zinc-800 bg-black/40 p-5">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">Graphic / Video Briefing</h2>
                <span className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                  Media Box
                </span>
              </div>

              <div className="overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-950">
                <div className="aspect-video">
                  <iframe
                    className="h-full w-full"
                    src="https://www.youtube.com/embed/PMDQ82w1pAE?modestbranding=1&rel=0"
                    title="Yahoo Sports Network Live"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                  />
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-zinc-400">{disclaimer}</p>
            </aside>
          </div>
        </header>

        <section className="mt-8 grid items-start gap-8 lg:grid-cols-[1.35fr_0.85fr]">
          <div className="flex flex-col gap-8">
            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold tracking-tight text-white">Lead Report</h2>
                <span className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                  Daily Edition
                </span>
              </div>

              <p className="text-base leading-8 text-zinc-300">{snapshot}</p>

              {keyStorylines.length > 0 ? (
                <div className="mt-5 border-t border-zinc-800 pt-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Key Storylines
                  </p>
                  <ul className="space-y-3">
                    {keyStorylines.map((item, index) => (
                      <li key={index} className="text-sm leading-7 text-zinc-300">
                        • {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {body ? (
                <div className="mt-5 border-t border-zinc-800 pt-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
                    Editorial Note
                  </p>
                  <p className="text-sm leading-7 text-zinc-300">{body}</p>
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6">
              <div className="mb-4 flex items-center justify-between gap-4">
                <h2 className="text-2xl font-bold tracking-tight text-white">Newsroom Snapshot</h2>
                <span className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                  Data Pulse
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <SnapshotColumn
                  title="Top Finals"
                  badge="Results"
                  items={deskItems.finals}
                  emptyText="Final scores will populate here as completed games are added to the feed."
                />
                <SnapshotColumn
                  title="Live Board"
                  badge="Tracking"
                  items={deskItems.live}
                  emptyText="No live events are listed in the current report window."
                />
                <SnapshotColumn
                  title="What’s Next"
                  badge="Schedule"
                  items={deskItems.upcoming}
                  emptyText="Upcoming schedule items will appear here when available."
                />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold tracking-tight text-white">Quick Stats</h2>
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                Snapshot
              </span>
            </div>

            <div className="space-y-3">
              {quickStatsItems.length > 0 ? (
                quickStatsItems.map((item, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-zinc-800 bg-black/40 p-4 text-sm leading-7 text-zinc-300"
                  >
                    {item}
                  </div>
                ))
              ) : (
                <p className="text-sm leading-7 text-zinc-400">
                  Quick stats will appear here when the report feed includes them.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold tracking-tight text-white">League Coverage</h2>
            <span className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              Core Report Sections
            </span>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {primaryLeagueCards.map((card) => (
              <LeagueCard
                key={card.key}
                title={card.label}
                sectionKey={card.key}
                section={card.data}
              />
            ))}
          </div>
        </section>

        {additionalCards.length > 0 ? (
          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold tracking-tight text-white">Additional Coverage</h2>
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                Expanded Sections
              </span>
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              {additionalCards.map((card) => (
                <LeagueCard
                  key={card.key}
                  title={card.label}
                  sectionKey={card.key}
                  section={card.data}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold tracking-tight text-white">Analytics Desk</h2>
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                Trends & Context
              </span>
            </div>

            <AnalyticsDesk sections={sections} />
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950/80 p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-2xl font-bold tracking-tight text-white">Full Report Feed</h2>
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                Raw Editorial Output
              </span>
            </div>

            <FullReportFeed
              headline={headline}
              body={body}
              keyStorylines={keyStorylines}
              globalReport={globalReport}
            />
          </div>
        </section>
      </div>
    </main>
  );
}