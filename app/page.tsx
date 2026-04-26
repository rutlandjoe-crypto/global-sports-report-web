import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

type JsonObject = { [key: string]: any };

// ✅ FIXED VIDEO (REAL EMBED)
const VIDEO_URL =
  process.env.NEXT_PUBLIC_GSR_VIDEO_URL ||
  "https://www.youtube.com/embed/5g3h1pHyRz4?autoplay=1&mute=1";

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

// ---------- EVERYTHING ELSE UNCHANGED ----------

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

  return (
    <article className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-neutral-200">
      <h2 className="text-2xl font-black text-neutral-950">{headline}</h2>
      <p className="mt-3 text-neutral-800">{snapshot}</p>

      <SectionList title="Key Storylines" items={storylines} />
      <SectionList title="Final Scores" items={finalScores} />
      <SectionList title="Yesterday Final Scores" items={yesterdayFinals} />
      <SectionList title="Today Schedule" items={todaySchedule} />
    </article>
  );
}

export default function Home() {
  const report = readReport();
  const sections = getReportSections(report);

  const headline = asText(report.headline);
  const snapshot = asText(report.snapshot);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h1 className="text-6xl font-black">{headline}</h1>
            <p className="mt-4 text-lg">{snapshot}</p>
          </div>

          <div className="rounded-3xl bg-white p-6">
            <div className="aspect-video">
              <iframe
                src={VIDEO_URL}
                title="Sports Live Video"
                allow="autoplay; encrypted-media"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-6 mt-10 lg:grid-cols-2">
          {sections.map((section, i) => (
            <ReportCard key={i} section={section} />
          ))}
        </div>
      </div>
    </main>
  );
}