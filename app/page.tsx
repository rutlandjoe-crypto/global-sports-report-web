import fs from "fs/promises";
import path from "path";

type AdvancedData = {
  headline?: string;
  snapshot?: string;
  key_storylines?: string[];
  key_data_points?: string[];
  why_it_matters?: string[];
  story_angles?: string[];
  watch_list?: string[];
  final_scores?: string[];
  live?: string[];
  upcoming?: string[];
  historical_context?: string;
  statcast_snapshot?: string;
  outlook?: string;
};

type LeagueSection = {
  key?: string;
  title?: string;
  source_file?: string;
  updated_at?: string;
  headline?: string;
  snapshot?: string;
  body?: string;
  bullets?: string[];
  content?: string;
  advanced?: AdvancedData;
};

type ReportData = {
  title?: string;
  headline?: string;
  body?: string;
  snapshot?: string;
  key_storylines?: string[];
  generated_at?: string;
  updated_at?: string;
  published_at?: string;
  disclaimer?: string;
  x_handle?: string;
  substack_url?: string;
  global_report?: string;
  sections?: Record<string, LeagueSection> | LeagueSection[];
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

async function getReportData(): Promise<ReportData> {
  try {
    const filePath = path.join(process.cwd(), "public", "latest_report.json");
    const file = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(file);

    return {
      ...FALLBACK_DATA,
      ...parsed,
      key_storylines: Array.isArray(parsed?.key_storylines) ? parsed.key_storylines : [],
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

function cleanText(value?: string): string {
  if (!value) return "";
  return value
    .replace(/\r/g, "")
    .replace(/â€™/g, "’")
    .replace(/â€œ/g, "“")
    .replace(/â€\x9d/g, "”")
    .replace(/â€/g, "”")
    .replace(/â€”/g, "—")
    .replace(/â€“/g, "–")
    .replace(/\u00a0/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function cleanList(values?: string[]): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((item) => cleanText(item).replace(/^- /, "").trim())
    .filter(Boolean);
}

function compactText(value?: string, maxLength = 220): string {
  const cleaned = cleanText(value);
  if (!cleaned) return "";
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength).trimEnd()}...`;
}

function normalizeSections(
  sections: ReportData["sections"]
): Record<string, LeagueSection> {
  if (!sections) return {};

  if (Array.isArray(sections)) {
    const mapped: Record<string, LeagueSection> = {};

    for (const item of sections) {
      const rawKey =
        item?.key ||
        item?.title ||
        item?.source_file ||
        `section_${Object.keys(mapped).length + 1}`;

      const normalizedKey = rawKey
        .toLowerCase()
        .replace(/\.txt$/i, "")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

      let finalKey = normalizedKey;

      if (normalizedKey.includes("mlb")) finalKey = "mlb";
      else if (normalizedKey.includes("nba")) finalKey = "nba";
      else if (normalizedKey.includes("nhl")) finalKey = "nhl";
      else if (normalizedKey.includes("nfl")) finalKey = "nfl";
      else if (normalizedKey.includes("soccer")) finalKey = "soccer";
      else if (normalizedKey.includes("betting")) finalKey = "betting_odds";
      else if (normalizedKey.includes("fantasy")) finalKey = "fantasy";

      mapped[finalKey] = item;
    }

    return mapped;
  }

  return sections;
}

function prettifyKey(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getLeagueCards(
  sections: Record<string, LeagueSection>
): { key: string; label: string; data?: LeagueSection }[] {
  return [
    { key: "mlb", label: "MLB", data: sections.mlb },
    { key: "nba", label: "NBA", data: sections.nba },
    { key: "nhl", label: "NHL", data: sections.nhl },
    { key: "nfl", label: "NFL", data: sections.nfl },
    { key: "soccer", label: "Soccer", data: sections.soccer },
    { key: "betting_odds", label: "Betting Odds", data: sections.betting_odds },
  ];
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
  const cleaned = cleanList(items);
  if (cleaned.length === 0) return null;
  if (cleaned.length === 1 && cleaned[0].startsWith("No ")) return null;

  return (
    <div className="mt-4 border-t border-zinc-800 pt-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
        {title}
      </p>
      <ul className="space-y-2">
        {cleaned.slice(0, limit).map((item, index) => (
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
  section,
}: {
  title: string;
  section?: LeagueSection;
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

  const advanced = section.advanced || {};
  const headline = cleanText(section.headline || advanced.headline);
  const snapshot = cleanText(section.snapshot || advanced.snapshot);
  const body = cleanText(section.body);
  const whyItMatters = cleanList(advanced.why_it_matters);
  const storyAngles = cleanList(advanced.story_angles);
  const watchList = cleanList(advanced.watch_list);
  const keyDataPoints = cleanList(advanced.key_data_points);
  const upcoming = cleanList(advanced.upcoming);
  const finalScores = cleanList(advanced.final_scores);
  const live = cleanList(advanced.live);
  const statcast = cleanText(advanced.statcast_snapshot);
  const outlook = cleanText(advanced.outlook);
  const historicalContext = cleanText(advanced.historical_context);

  const leadText =
    snapshot ||
    headline ||
    compactText(body, 260) ||
    "Section data is available, but no summary was found.";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {section.updated_at ? (
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-zinc-500">
              {cleanText(section.updated_at)}
            </p>
          ) : null}
        </div>
        <span className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-zinc-400">
          Live Feed
        </span>
      </div>

      <p className="text-sm leading-7 text-zinc-300">{leadText}</p>

      <SectionList title="Key Data Points" items={keyDataPoints} limit={3} />
      <SectionList title="Why It Matters" items={whyItMatters} limit={3} />
      <SectionList title="Story Angles" items={storyAngles} limit={3} />
      <SectionList title="Watch List" items={watchList} limit={3} />
      <SectionList title="Live" items={live} limit={3} />
      <SectionList title="Final Scores" items={finalScores} limit={4} />
      <SectionList title="Upcoming" items={upcoming} limit={4} />

      {statcast ? (
        <div className="mt-4 border-t border-zinc-800 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Statcast Snapshot
          </p>
          <p className="text-sm leading-7 text-zinc-300">{statcast}</p>
        </div>
      ) : null}

      {historicalContext ? (
        <div className="mt-4 border-t border-zinc-800 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Historical Context
          </p>
          <p className="text-sm leading-7 text-zinc-300">{historicalContext}</p>
        </div>
      ) : null}

      {outlook ? (
        <div className="mt-4 border-t border-zinc-800 pt-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Outlook
          </p>
          <p className="text-sm leading-7 text-zinc-300">{outlook}</p>
        </div>
      ) : null}
    </div>
  );
}

function AnalyticsDesk({
  sections,
}: {
  sections: Record<string, LeagueSection>;
}) {
  const items: { title: string; text: string }[] = [];

  Object.entries(sections).forEach(([leagueKey, section]) => {
    const advanced = section.advanced || {};

    const pushGroup = (label: string, values?: string[], limit = 2) => {
      cleanList(values)
        .slice(0, limit)
        .forEach((value) => {
          items.push({
            title: `${prettifyKey(leagueKey)} · ${label}`,
            text: value,
          });
        });
    };

    pushGroup("Key Data Points", advanced.key_data_points, 2);
    pushGroup("Why It Matters", advanced.why_it_matters, 2);
    pushGroup("Story Angles", advanced.story_angles, 2);
    pushGroup("Watch List", advanced.watch_list, 2);

    if (cleanText(advanced.historical_context)) {
      items.push({
        title: `${prettifyKey(leagueKey)} · Historical Context`,
        text: cleanText(advanced.historical_context),
      });
    }

    if (cleanText(advanced.statcast_snapshot)) {
      items.push({
        title: `${prettifyKey(leagueKey)} · Statcast Snapshot`,
        text: cleanText(advanced.statcast_snapshot),
      });
    }

    if (cleanText(advanced.outlook)) {
      items.push({
        title: `${prettifyKey(leagueKey)} · Outlook`,
        text: cleanText(advanced.outlook),
      });
    }
  });

  const trimmed = items.slice(0, 10);

  if (trimmed.length === 0) {
    return (
      <p className="text-sm leading-7 text-zinc-400">
        Historical context, matchup signals, Statcast notes, betting context, and draft angles will populate here when advanced report fields are available.
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

export default async function HomePage() {
  const data = await getReportData();
  const sections = normalizeSections(data.sections);
  const leagueCards = getLeagueCards(sections);

  const title = cleanText(data.title) || "GLOBAL SPORTS REPORT";
  const headline =
    cleanText(data.headline) ||
    "Automated sports journalism support for the modern newsroom.";
  const body =
    cleanText(data.body) || "The latest report feed is being prepared.";
  const keyStorylines = cleanList(data.key_storylines);
  const snapshot = cleanText(data.snapshot) || body;
  const updatedAt = cleanText(data.updated_at || data.meta?.generated_at) || "Update pending";
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

  const stats = [
    { label: "Updated", value: updatedAt },
    { label: "Published", value: publishedAt },
    {
      label: "Coverage",
      value: ["MLB", "NBA", "NHL", "NFL", "Soccer", "Betting"].join(" · "),
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
          <div className="grid gap-8 lg:grid-cols-[1.5fr_0.9fr]">
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
                  className="rounded-xl border border-zinc-700 bg-white px-4 py-2 text-sm font-semibold text-black transition hover:opacity-90"
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
                  href="/latest_report.json"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-900"
                >
                  Latest JSON Feed
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

              <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-950 text-center">
                <div className="max-w-xs px-6">
                  <p className="text-sm font-medium text-zinc-300">
                    Reserved for a daily video recap or graphic snapshot.
                  </p>
                  <p className="mt-2 text-xs leading-6 text-zinc-500">
                    This box is ready for a future embed without breaking the report layout.
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-zinc-400">{disclaimer}</p>
            </aside>
          </div>
        </header>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.85fr]">
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
              <h2 className="text-2xl font-bold tracking-tight text-white">Quick Stats</h2>
              <span className="rounded-full border border-zinc-700 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
                Snapshot
              </span>
            </div>

            <div className="space-y-3">
              {keyStorylines.length > 0 ? (
                keyStorylines.slice(0, 5).map((item, index) => (
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
            {leagueCards.map((card) => (
              <LeagueCard key={card.key} title={card.label} section={card.data} />
            ))}
          </div>
        </section>

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