import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

type JsonObject = { [key: string]: any };

const VIDEO_URL =
  process.env.NEXT_PUBLIC_GSR_VIDEO_URL ||
  "https://www.youtube.com/embed/21X5lGlDOfg";

const TOOLKIT_LINKS = [
  {
    name: "ESPN",
    url: "https://www.espn.com/",
    note: "Scores, schedules, standings and breaking sports coverage.",
  },
  {
    name: "The Athletic",
    url: "https://www.nytimes.com/athletic/",
    note: "Deep reporting, analysis and beat coverage.",
  },
  {
    name: "Sports Reference",
    url: "https://www.sports-reference.com/",
    note: "Historical stats, player pages and team databases.",
  },
  {
    name: "Baseball Savant",
    url: "https://baseballsavant.mlb.com/",
    note: "Statcast data, pitch tracking and MLB advanced metrics.",
  },
  {
    name: "Spotrac",
    url: "https://www.spotrac.com/",
    note: "Contracts, salary caps, payrolls and roster spending.",
  },
];

function readReport(): JsonObject {
  try {
    const filePath = path.join(process.cwd(), "public", "latest_report.json");
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {
      site: "Global Sports Report",
      brand: "Built for journalists, by a journalist.",
      headline: "Global Sports Report Is Loading Today’s Sports Board",
      snapshot:
        "The report file could not be loaded yet. Check public/latest_report.json.",
      sections: [],
    };
  }
}

function asText(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(asText).filter(Boolean).join(" ");
  if (typeof value === "object") {
    return (
      value.text ||
      value.title ||
      value.headline ||
      value.name ||
      value.summary ||
      value.description ||
      value.result ||
      value.game ||
      value.matchup ||
      ""
    )
      .toString()
      .trim();
  }
  return "";
}

function splitCleanLines(value: string): string[] {
  return value
    .replace(/\r/g, "\n")
    .split(/\n|•|(?:\s+-\s+)|(?:\s+\|\s+)/)
    .map((item) =>
      item
        .replace(/^[-–—•\s]+/, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean);
}

function asList(value: any): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => {
        if (typeof item === "string") return splitCleanLines(item);

        if (item && typeof item === "object") {
          const parts = [
            item.time,
            item.status,
            item.away_team || item.away,
            item.away_score,
            item.home_team || item.home,
            item.home_score,
            item.text,
            item.title,
            item.headline,
            item.name,
            item.summary,
            item.note,
            item.angle,
          ]
            .map(asText)
            .filter(Boolean);

          if (parts.length) return [parts.join(" — ")];

          return splitCleanLines(asText(item));
        }

        return splitCleanLines(asText(item));
      })
      .map((item) => item.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }

  if (typeof value === "string") return splitCleanLines(value);

  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, val]) => {
        const text = asText(val);
        if (!text) return "";
        return `${cleanTitle(key)} — ${text}`;
      })
      .filter(Boolean);
  }

  return [];
}

function cleanTitle(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function pickFirst(...values: any[]): any {
  return values.find((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "string") return value.trim().length > 0;
    return value !== null && value !== undefined;
  });
}

function normalizeSection(key: string, value: any): JsonObject {
  const title = asText(value.title) || cleanTitle(key);

  return {
    id: value.id || key,
    title,
    headline: pickFirst(value.headline, value.title, title),
    snapshot: pickFirst(value.snapshot, value.summary, value.body, value.content, ""),
    key_storylines: pickFirst(
      value.key_storylines,
      value.keyStorylines,
      value.storylines,
      value.top_storylines,
      value.items,
      []
    ),
    final_scores: pickFirst(
      value.final_scores,
      value.finalScores,
      value.finals,
      value.scores,
      []
    ),
    yesterday_final_scores: pickFirst(
      value.yesterday_final_scores,
      value.yesterdayFinalScores,
      value.previous_final_scores,
      []
    ),
    today_live: pickFirst(value.today_live, value.live, value.live_games, []),
    today_schedule: pickFirst(
      value.today_schedule,
      value.todaySchedule,
      value.schedule,
      value.upcoming,
      []
    ),
    advanced_watch: pickFirst(
      value.advanced_watch,
      value.advancedWatch,
      value.metrics,
      value.analytics,
      value.advanced,
      []
    ),
    story_angles: pickFirst(value.story_angles, value.storyAngles, value.angles, []),
    why_it_matters: pickFirst(value.why_it_matters, value.whyItMatters, ""),
    source_file: value.source_file || "",
    updated_at: pickFirst(value.updated_at, value.generated_at, value.published_at, ""),
  };
}

function getReportSections(report: JsonObject): any[] {
  if (!report || typeof report !== "object") return [];

  if (Array.isArray(report.sections)) {
    return report.sections
      .filter(Boolean)
      .map((section: any, index: number) =>
        normalizeSection(section.id || section.title || `section-${index}`, section)
      );
  }

  if (report.sections && typeof report.sections === "object") {
    return Object.entries(report.sections)
      .filter(([, value]) => value && typeof value === "object")
      .map(([key, value]: [string, any]) => normalizeSection(key, value));
  }

  return [];
}

function sectionHasRealContent(section: any): boolean {
  const headline = asText(section.headline || section.title);
  const snapshot = asText(section.snapshot);

  const lists = [
    asList(section.key_storylines),
    asList(section.final_scores),
    asList(section.yesterday_final_scores),
    asList(section.today_live),
    asList(section.today_schedule),
    asList(section.advanced_watch),
    asList(section.story_angles),
  ];

  const whyItMatters = asText(section.why_it_matters);

  return (
    headline.length >= 10 &&
    (snapshot.length >= 15 ||
      whyItMatters.length >= 15 ||
      lists.some((list) => list.length > 0))
  );
}

function SectionList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;

  return (
    <div className="mt-5">
      <h4 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-red-700">
        {title}
      </h4>

      <div className="space-y-2">
        {items.slice(0, 8).map((item, index) => (
          <div
            key={`${title}-${index}`}
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-semibold leading-6 text-neutral-950"
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function ReportCard({ section }: { section: any }) {
  const title = asText(section.title || "Report");
  const headline = asText(section.headline || title);
  const snapshot = asText(section.snapshot);
  const updatedAt = asText(section.updated_at);

  const storylines = asList(section.key_storylines);
  const finalScores = asList(section.final_scores);
  const yesterdayFinals = asList(section.yesterday_final_scores);
  const todayLive = asList(section.today_live);
  const todaySchedule = asList(section.today_schedule);
  const advancedWatch = asList(section.advanced_watch);
  const storyAngles = asList(section.story_angles);
  const whyItMatters = asText(section.why_it_matters);

  if (!sectionHasRealContent(section)) return null;

  return (
    <article className="rounded-3xl bg-white p-6 text-neutral-950 shadow-xl ring-1 ring-neutral-200">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-red-700">
          {title}
        </p>

        {updatedAt ? (
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500">
            Updated {updatedAt}
          </p>
        ) : null}
      </div>

      <h2 className="text-2xl font-black leading-tight text-neutral-950">
        {headline}
      </h2>

      {snapshot ? (
        <div className="mt-4 rounded-2xl bg-neutral-100 p-4">
          <p className="text-base font-semibold leading-7 text-neutral-800">
            {snapshot}
          </p>
        </div>
      ) : null}

      <SectionList title="Key Storylines" items={storylines} />
      <SectionList title="Yesterday Final Scores" items={yesterdayFinals} />
      <SectionList title="Final Scores" items={finalScores} />
      <SectionList title="Today Live" items={todayLive} />
      <SectionList title="Today Schedule" items={todaySchedule} />
      <SectionList title="Advanced Watch" items={advancedWatch} />
      <SectionList title="Story Angles" items={storyAngles} />

      {whyItMatters ? (
        <div className="mt-5 rounded-2xl bg-neutral-950 p-4 text-white">
          <h4 className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-red-400">
            Why It Matters
          </h4>
          <p className="text-sm font-semibold leading-6">{whyItMatters}</p>
        </div>
      ) : null}
    </article>
  );
}

function VideoCard() {
  return (
    <section className="rounded-3xl bg-white p-6 text-neutral-950 shadow-xl ring-1 ring-neutral-200">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-red-700">
          Live Video
        </p>
        <h2 className="mt-2 text-2xl font-black text-neutral-950">
          Global Sports Report Video Desk
        </h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-neutral-700">
          A live sports video window paired with the latest newsroom-ready report.
        </p>
      </div>

      <div className="aspect-video overflow-hidden rounded-2xl bg-neutral-950">
        <iframe
          src={VIDEO_URL.includes("?") ? VIDEO_URL : `${VIDEO_URL}?autoplay=1&mute=1`}
          title="Global Sports Report Video Desk"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
    </section>
  );
}

function JournalistToolkitCard() {
  return (
    <section className="rounded-3xl bg-white p-6 text-neutral-950 shadow-xl ring-1 ring-neutral-200">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-red-700">
        Journalist Toolkit
      </p>

      <h2 className="mt-2 text-2xl font-black text-neutral-950">
        Five Go-To Sports Sites For Reporters
      </h2>

      <div className="mt-5 space-y-3">
        {TOOLKIT_LINKS.map((item) => (
          <a
            key={item.name}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 transition hover:bg-white hover:shadow-md"
          >
            <span className="block text-sm font-black text-neutral-950">
              {item.name}
            </span>
            <span className="mt-1 block text-sm font-semibold leading-6 text-neutral-700">
              {item.note}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const report = readReport();
  const sections = getReportSections(report).filter(sectionHasRealContent);

  const headline =
    asText(report.headline) ||
    "Global Sports Report Is Loading Today’s Sports Board";

  const snapshot =
    asText(report.snapshot) ||
    "A fresh sports report is being prepared for journalists, editors, and newsroom decision-makers.";

  const updatedAt =
    asText(report.updated_at) ||
    asText(report.generated_at) ||
    asText(report.published_at);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <header className="overflow-hidden rounded-[2rem] bg-white text-neutral-950 shadow-2xl ring-1 ring-neutral-200">
          <div className="border-b-8 border-red-700 bg-neutral-950 px-6 py-5 text-white md:px-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-red-400">
                  Global Sports Report
                </p>
                <p className="mt-2 text-sm font-black uppercase tracking-[0.2em] text-white">
                  Built for journalists, by a journalist.
                </p>
              </div>

              {updatedAt ? (
                <p className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-neutral-950">
                  Updated {updatedAt}
                </p>
              ) : null}
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-red-700">
                  Today’s Sports Intelligence
                </p>

                <h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">
                  {headline}
                </h1>

                <p className="mt-5 max-w-4xl text-lg font-semibold leading-8 text-neutral-800">
                  {snapshot}
                </p>

                <div className="mt-6 rounded-3xl bg-neutral-950 p-6 text-white">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-red-400">
                    Editorial Standard
                  </p>
                  <h2 className="mt-3 text-3xl font-black leading-tight">
                    Real sports headlines. Clean data. No empty cards.
                  </h2>
                  <p className="mt-4 text-base font-semibold leading-7 text-neutral-200">
                    Global Sports Report is built to surface usable angles,
                    current scores, schedules, advanced watch points and
                    newsroom-ready context for working journalists.
                  </p>
                </div>
              </div>

              <VideoCard />
            </div>
          </div>
        </header>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <JournalistToolkitCard />

          {sections.length === 0 ? (
            <article className="rounded-3xl bg-white p-6 text-neutral-950 shadow-xl ring-1 ring-neutral-200">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-700">
                Report Status
              </p>
              <h2 className="mt-2 text-2xl font-black">
                No complete report cards are ready yet.
              </h2>
              <p className="mt-3 text-base leading-7 text-neutral-800">
                The site is protecting the page from empty cards. Check
                public/latest_report.json or rerun the content engine.
              </p>
            </article>
          ) : (
            sections.map((section, index) => (
              <ReportCard key={section.id || index} section={section} />
            ))
          )}
        </section>
      </div>
    </main>
  );
}