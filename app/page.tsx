import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

type JsonObject = { [key: string]: any };

const VIDEO_URL = "https://www.youtube.com/embed/21X5lGlDOfg";

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
          )
            .toString()
            .trim();
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

function sectionHasRealContent(section: any): boolean {
  const headline = asText(section.headline || section.title);
  const snapshot = asText(section.snapshot);

  const storylines = asList(section.key_storylines);
  const finalScores = asList(section.final_scores);
  const yesterdayFinals = asList(section.yesterday_final_scores);
  const todaySchedule = asList(section.today_schedule);
  const advancedWatch = asList(section.advanced_watch);
  const storyAngles = asList(section.story_angles);
  const whyItMatters = asText(section.why_it_matters);

  const hasRealHeadline = headline.length >= 15;
  const hasBodyContent =
    snapshot.length >= 20 ||
    storylines.length > 0 ||
    finalScores.length > 0 ||
    yesterdayFinals.length > 0 ||
    todaySchedule.length > 0 ||
    advancedWatch.length > 0 ||
    storyAngles.length > 0 ||
    whyItMatters.length >= 20;

  return hasRealHeadline && hasBodyContent;
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

  if (!sectionHasRealContent(section)) return null;

  return (
    <article className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-neutral-200">
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
        <p className="mt-3 text-base leading-7 text-neutral-800">{snapshot}</p>
      ) : null}

      <SectionList title="Key Storylines" items={storylines} />
      <SectionList title="Final Scores" items={finalScores} />
      <SectionList title="Yesterday Final Scores" items={yesterdayFinals} />
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
    <section className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-neutral-200">
      <div className="mb-4">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-red-700">
          Live Video
        </p>
        <h2 className="mt-2 text-2xl font-black text-neutral-950">
          Global Sports Report Video Desk
        </h2>
      </div>

      <div className="aspect-video overflow-hidden rounded-2xl bg-neutral-950">
        {VIDEO_URL ? (
          <iframe
            src={`${VIDEO_URL}?autoplay=1&mute=1`}
            title="Sports Live Video"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm font-bold text-white">
            Video feed unavailable. The latest report remains available below.
          </div>
        )}
      </div>
    </section>
  );
}

function JournalistToolkitCard() {
  const links = [
    "ESPN",
    "The Athletic",
    "Sports Reference",
    "Baseball Savant",
    "Spotrac",
  ];

  return (
    <section className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-neutral-200">
      <p className="text-xs font-black uppercase tracking-[0.22em] text-red-700">
        Journalist Toolkit
      </p>
      <h2 className="mt-2 text-2xl font-black text-neutral-950">
        Five Go-To Sports Sites For Reporters
      </h2>
      <div className="mt-5 space-y-3">
        {links.map((item) => (
          <div
            key={item}
            className="border-l-4 border-red-600 bg-neutral-50 px-4 py-3 text-sm font-black text-neutral-950"
          >
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const report = readReport();
  const sections = getReportSections(report).filter(sectionHasRealContent);

  const headline =
    asText(report.headline) || "Global Sports Report Is Loading Today’s Sports Board";
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
        <header className="rounded-[2rem] bg-white p-6 text-neutral-950 shadow-2xl ring-1 ring-neutral-200 md:p-8">
          <div className="mb-6 border-b border-neutral-200 pb-5">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-red-700">
              Global Sports Report
            </p>
            <h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">
              {headline}
            </h1>
            <p className="mt-4 max-w-4xl text-lg font-semibold leading-8 text-neutral-800">
              {snapshot}
            </p>
            {updatedAt ? (
              <p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-neutral-500">
                Updated {updatedAt}
              </p>
            ) : null}
            <p className="mt-4 text-sm font-black uppercase tracking-[0.2em] text-red-700">
              Built for journalists, by a journalist.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl bg-neutral-950 p-6 text-white">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-400">
                Editorial Standard
              </p>
              <h2 className="mt-3 text-3xl font-black leading-tight">
                Fast sports intelligence without empty filler.
              </h2>
              <p className="mt-4 text-base font-semibold leading-7 text-neutral-200">
                Global Sports Report is built to surface real headlines, usable
                angles, current scores, schedules, and analysis for working
                journalists.
              </p>
            </div>

            <VideoCard />
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
            sections.map((section, i) => (
              <ReportCard key={section.id || i} section={section} />
            ))
          )}
        </section>
      </div>
    </main>
  );
}