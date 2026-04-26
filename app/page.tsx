import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

type JsonObject = { [key: string]: any };

const VIDEO_URL =
  process.env.NEXT_PUBLIC_GSR_VIDEO_URL ||
  "https://sports.yahoo.com/videos/";

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
  return "";
}

function asList(value: any): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          return (
            item.text ||
            item.title ||
            item.headline ||
            item.name ||
            item.summary ||
            ""
          ).toString().trim();
        }
        return "";
      })
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(/\n|•|- /)
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  return [];
}

function cleanTitle(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getReportSections(report: JsonObject): any[] {
  if (!report || typeof report !== "object") return [];

  if (Array.isArray(report.sections)) {
    return report.sections.filter(Boolean);
  }

  if (report.sections && typeof report.sections === "object") {
    return Object.entries(report.sections)
      .filter(([, value]) => value && typeof value === "object")
      .map(([key, value]: [string, any]) => {
        const title = value.title || cleanTitle(key);

        return {
          id: value.id || key,
          title,
          headline: value.headline || title,
          snapshot: value.snapshot || value.summary || "",
          key_storylines:
            value.key_storylines ||
            value.keyStorylines ||
            value.storylines ||
            value.items ||
            [],
          final_scores: value.final_scores || value.finalScores || [],
          yesterday_final_scores:
            value.yesterday_final_scores || value.yesterdayFinalScores || [],
          today_schedule:
            value.today_schedule || value.todaySchedule || value.schedule || [],
          advanced_watch:
            value.advanced_watch || value.advancedWatch || value.metrics || [],
          story_angles: value.story_angles || value.storyAngles || [],
          why_it_matters: value.why_it_matters || value.whyItMatters || "",
          source_file: value.source_file || "",
          updated_at: value.updated_at || value.generated_at || "",
        };
      });
  }

  return [];
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
    <div className="mt-5">
      <h4 className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-red-700">
        {title}
      </h4>
      <div className="space-y-3">
        {items.slice(0, 6).map((item, index) => (
          <div
            key={`${title}-${index}`}
            className="border-l-4 border-red-600 bg-neutral-50 px-4 py-3 text-sm font-semibold leading-6 text-neutral-900"
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
  const todaySchedule = asList(section.today_schedule);
  const advancedWatch = asList(section.advanced_watch);
  const storyAngles = asList(section.story_angles);
  const whyItMatters = asText(section.why_it_matters);

  return (
    <article className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-neutral-200">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full border border-red-300 bg-red-50 px-4 py-2 text-xs font-black uppercase tracking-wide text-red-700">
          {title}
        </span>

        {updatedAt ? (
          <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-700">
            {updatedAt}
          </span>
        ) : null}
      </div>

      <h2 className="text-2xl font-black leading-tight text-neutral-950">
        {headline}
      </h2>

      {snapshot ? (
        <p className="mt-4 text-base font-medium leading-7 text-neutral-800">
          {snapshot}
        </p>
      ) : null}

      {whyItMatters ? (
        <div className="mt-5 rounded-2xl bg-neutral-950 p-4 text-white">
          <h4 className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-red-400">
            Why It Matters
          </h4>
          <p className="text-sm font-semibold leading-6">{whyItMatters}</p>
        </div>
      ) : null}

      <SectionList title="Key Storylines" items={storylines} />
      <SectionList title="Yesterday Final Scores" items={yesterdayFinals} />
      <SectionList title="Final Scores" items={finalScores} />
      <SectionList title="Today Schedule" items={todaySchedule} />
      <SectionList title="Advanced Watch" items={advancedWatch} />
      <SectionList title="Story Angles" items={storyAngles} />
    </article>
  );
}

export default function Home() {
  const report = readReport();
  const sections = getReportSections(report);

  const site = asText(report.site || "Global Sports Report");
  const brand = asText(report.brand || "Built for journalists, by a journalist.");
  const headline = asText(
    report.headline || "Global Sports Report Tracks Today’s Biggest Sports Story"
  );
  const snapshot = asText(
    report.snapshot ||
      "Daily sports intelligence, scores, schedules and journalist-ready storylines."
  );
  const updatedAt = asText(report.updated_at || report.generated_at);
  const keyStorylines = asList(report.key_storylines);

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <header className="grid gap-8 border-b border-neutral-800 pb-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-6 flex flex-wrap gap-3">
              <span className="rounded-full bg-red-700 px-5 py-2 text-xs font-black uppercase tracking-[0.28em] text-white">
                {site}
              </span>
              <span className="rounded-full border border-neutral-600 px-5 py-2 text-xs font-black uppercase tracking-[0.28em] text-white">
                {brand}
              </span>
            </div>

            <h1 className="max-w-4xl text-5xl font-black leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl">
              {headline}
            </h1>

            <p className="mt-6 max-w-3xl text-lg font-semibold leading-8 text-neutral-200">
              {snapshot}
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              {updatedAt ? (
                <span className="rounded-full bg-white px-4 py-2 text-xs font-black uppercase tracking-wide text-black">
                  Updated {updatedAt}
                </span>
              ) : null}

              <span className="rounded-full border border-red-500 px-4 py-2 text-xs font-black uppercase tracking-wide text-red-300">
                {sections.length} reports
              </span>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow-2xl">
            <div className="overflow-hidden rounded-none bg-black">
              <div className="px-5 py-4">
                <div className="text-xs font-black uppercase tracking-[0.32em] text-red-500">
                  Live Video
                </div>
                <div className="mt-1 text-lg font-black text-white">
                  Sports News Stream
                </div>
              </div>

              <div className="aspect-video bg-neutral-900">
                <iframe
                  src={VIDEO_URL}
                  title="Sports News Stream"
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full border-0"
                />
              </div>
            </div>
          </div>
        </header>

        {keyStorylines.length ? (
          <section className="grid gap-4 border-b border-neutral-800 py-8 md:grid-cols-2 lg:grid-cols-4">
            {keyStorylines.slice(0, 4).map((item, index) => (
              <div
                key={`top-storyline-${index}`}
                className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
              >
                <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-red-500">
                  Storyline {index + 1}
                </div>
                <p className="text-sm font-semibold leading-6 text-neutral-100">
                  {item}
                </p>
              </div>
            ))}
          </section>
        ) : null}

        <section className="grid gap-6 py-8 lg:grid-cols-2">
          {sections.length ? (
            sections.map((section, index) => (
              <ReportCard key={section.id || section.title || index} section={section} />
            ))
          ) : (
            <article className="rounded-3xl bg-white p-6 text-black">
              <h2 className="text-2xl font-black">No report sections found.</h2>
              <p className="mt-3 font-semibold">
                Check public/latest_report.json and confirm it has a sections array.
              </p>
            </article>
          )}
        </section>

        <footer className="border-t border-neutral-800 py-8 text-sm font-semibold text-neutral-400">
          Global Sports Report · Built for journalists, by a journalist.
        </footer>
      </section>
    </main>
  );
}