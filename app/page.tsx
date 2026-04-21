import fs from "fs";
import path from "path";
import { unstable_noStore as noStore } from "next/cache";

type Primitive = string | number | boolean | null | undefined;
type JsonValue = Primitive | JsonValue[] | { [key: string]: JsonValue };
type AnyRecord = Record<string, JsonValue>;

type LeagueBlock = {
  key: string;
  label: string;
  title: string;
  summary: string;
  storylines: string[];
  dataPoints: string[];
  live: string[];
  finals: string[];
  upcoming: string[];
  analytics: string[];
};

type ReportData = {
  [key: string]: JsonValue;
};

const SUBSTACK_URL = "https://globalsportsreport.substack.com/";
const X_URL = "https://x.com/GlobalSportsRep";
const YAHOO_SPORTS_URL = "https://www.youtube.com/live/PMDQ82w1pAE?si=vwefZSHtIDkb3-dY";

const LEAGUE_LABELS: Record<string, string> = {
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

const PREFERRED_ORDER = [
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
  return input
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function labelForKey(key: string): string {
  return LEAGUE_LABELS[key] ?? titleCase(key);
}

function readJson(): ReportData {
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

function getTimestamp(data: ReportData): string {
  return (
    safeString(data.generated_at) ||
    safeString(data.updated_at) ||
    safeString(data.timestamp) ||
    safeString(data.last_updated) ||
    "Timestamp unavailable"
  );
}

function getTopHeadline(data: ReportData): string {
  return safeString(data.headline) || "";
}

function getTopSnapshot(data: ReportData): string {
  return safeString(data.snapshot) || safeString(data.summary) || "";
}

function getTopStorylines(data: ReportData): string[] {
  return dedupe([
    ...safeStringArray(data.key_storylines),
    ...safeStringArray(data.keyStorylines),
    ...safeStringArray(data.storylines),
  ]);
}

function maybeStringFromObjectField(obj: AnyRecord, keys: string[]): string {
  for (const key of keys) {
    const value = safeString(obj[key]);
    if (value) return value;
  }
  return "";
}

function maybeArrayFromObjectField(obj: AnyRecord, keys: string[]): string[] {
  for (const key of keys) {
    const values = safeStringArray(obj[key]);
    if (values.length) return dedupe(values);
  }
  return [];
}

function extractSectionsObject(data: ReportData): Record<string, AnyRecord> {
  const out: Record<string, AnyRecord> = {};

  if (isRecord(data.sections)) {
    for (const [key, value] of Object.entries(data.sections)) {
      if (isRecord(value)) out[key] = value;
    }
  }

  for (const key of Object.keys(data)) {
    if (PREFERRED_ORDER.includes(key) && isRecord(data[key])) {
      out[key] = data[key] as AnyRecord;
    }
  }

  return out;
}

function buildLeagueBlock(key: string, section: AnyRecord): LeagueBlock | null {
  const label = labelForKey(key);

  const title =
    maybeStringFromObjectField(section, ["title", "headline"]) || `${label} Report`;

  const summary = maybeStringFromObjectField(section, [
    "summary",
    "snapshot",
    "text",
    "body",
    "overview",
  ]);

  const storylines = maybeArrayFromObjectField(section, [
    "key_storylines",
    "keyStorylines",
    "storylines",
  ]);

  const dataPoints = maybeArrayFromObjectField(section, [
    "key_data_points",
    "keyDataPoints",
    "data_points",
    "dataPoints",
  ]);

const games = isRecord(section.games) ? section.games : {};

const live =
  maybeArrayFromObjectField(section, ["live", "live_games"]).length
    ? maybeArrayFromObjectField(section, ["live", "live_games"])
    : safeStringArray(games.live);

const finals =
  maybeArrayFromObjectField(section, ["finals", "final", "results"]).length
    ? maybeArrayFromObjectField(section, ["finals", "final", "results"])
    : safeStringArray(games.final);

const upcoming =
  maybeArrayFromObjectField(section, ["upcoming", "schedule"]).length
    ? maybeArrayFromObjectField(section, ["upcoming", "schedule"])
    : safeStringArray(games.upcoming);

  const hasContent =
    !!summary ||
    storylines.length > 0 ||
    dataPoints.length > 0 ||
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
    storylines,
    dataPoints,
    live,
    finals,
    upcoming,
    analytics,
  };
}

function extractLeagueBlocks(data: ReportData): LeagueBlock[] {
  const sectionMap = extractSectionsObject(data);
  const ordered: LeagueBlock[] = [];

  for (const key of PREFERRED_ORDER) {
    if (sectionMap[key]) {
      const block = buildLeagueBlock(key, sectionMap[key]);
      if (block) ordered.push(block);
    }
  }

  for (const [key, section] of Object.entries(sectionMap)) {
    if (!PREFERRED_ORDER.includes(key)) {
      const block = buildLeagueBlock(key, section);
      if (block) ordered.push(block);
    }
  }

  return ordered;
}

function SidebarButton({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
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

function SectionList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (!items.length) return null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
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

function LeagueSection({ block }: { block: LeagueBlock }) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-950/95 p-6 shadow-xl shadow-black/30">
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.26em] text-zinc-500">
          {block.label}
        </p>
        <h2 className="text-2xl font-bold text-white">{block.title}</h2>
      </div>

      {block.summary ? (
        <div className="mb-5 rounded-2xl border border-zinc-800 bg-black/35 p-5">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Snapshot
          </h3>
          <p className="text-base leading-7 text-zinc-200">{block.summary}</p>
        </div>
      ) : null}

      {block.storylines.length ? (
        <div className="mb-5 rounded-2xl border border-zinc-800 bg-black/35 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Key Storylines
          </h3>
          <div className="space-y-2">
            {block.storylines.map((item, index) => (
              <div
                key={`story-${block.key}-${index}`}
                className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm leading-6 text-zinc-200"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {block.dataPoints.length ? (
        <div className="mb-5 rounded-2xl border border-zinc-800 bg-black/35 p-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400">
            Key Data Points
          </h3>
          <div className="space-y-2">
            {block.dataPoints.map((item, index) => (
              <div
                key={`data-${block.key}-${index}`}
                className="rounded-xl border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-sm leading-6 text-zinc-200"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionList title="Live" items={block.live} />
        <SectionList title="Final Scores" items={block.finals} />
        <SectionList title="Upcoming" items={block.upcoming} />
        <SectionList title="Analytics & Notes" items={block.analytics} />
      </div>
    </section>
  );
}

export default function Page() {
  const data = readJson();

  const title = safeString(data.title) || "GLOBAL SPORTS REPORT";
  const timestamp = getTimestamp(data);
  const headline = getTopHeadline(data);
  const snapshot = getTopSnapshot(data);
  const topStorylines = getTopStorylines(data);
  const leagueBlocks = extractLeagueBlocks(data);

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
                  <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-black">
                    <iframe
                      src={YAHOO_SPORTS_URL}
                      title="Yahoo Sports 24/7"
                      className="h-[260px] w-full"
                    />
                  </div>
                </div>
              </div>
            </section>

            {topStorylines.length ? (
              <section className="rounded-3xl border border-zinc-800 bg-zinc-950/95 p-6 shadow-xl shadow-black/30">
                <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.24em] text-zinc-400">
                  Key Storylines
                </h2>
                <div className="space-y-3">
                  {topStorylines.map((item, index) => (
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

            {leagueBlocks.length ? (
              <div className="space-y-6">
                {leagueBlocks.map((block) => (
                  <LeagueSection key={block.key} block={block} />
                ))}
              </div>
            ) : (
              <section className="rounded-3xl border border-zinc-800 bg-zinc-950/95 p-6 shadow-xl shadow-black/30">
                <h2 className="mb-3 text-lg font-bold text-white">
                  Awaiting structured league data
                </h2>
                <p className="text-base leading-7 text-zinc-300">
                  The page layout is ready, but the current JSON feed is not delivering clean
                  per-league sections yet.
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
                <SidebarButton href={SUBSTACK_URL} label="Substack" />
                <SidebarButton href={X_URL} label="X / Twitter" />
                <SidebarButton href={YAHOO_SPORTS_URL} label="Yahoo Sports 24/7 Network" />
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-800 bg-black/35 p-4">
                <p className="text-sm leading-7 text-zinc-300">
                  This report is an automated summary intended to support, not replace,
                  human sports journalism.
                </p>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}