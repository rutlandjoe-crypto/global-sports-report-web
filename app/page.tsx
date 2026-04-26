import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

type JsonObject = { [key: string]: any };

const SITE = {
  name: "Global Sports Report",
  tagline: "Built for journalists, by a journalist.",
  url: "https://globalsportsreport.com",
  xHandle: "@GlobalSportsRp",
  substack: "https://globalsportsreport.substack.com",
};

const COLORS = {
  pageBg: "bg-neutral-950",
  red: "bg-red-700",
  redText: "text-red-700",
  redBorder: "border-red-700",
  card: "bg-white",
  cardText: "text-neutral-950",
  mutedText: "text-neutral-700",
};

const VIDEO_URL =
  process.env.NEXT_PUBLIC_GSR_VIDEO_URL ||
  "https://www.youtube.com/embed/PMDQ82w1pAE?autoplay=1&mute=1";

function readReport(): JsonObject {
  try {
    const filePath = path.join(process.cwd(), "public", "latest_report.json");
    const raw = fs.readFileSync(filePath, "utf8");
    return JSON.parse(raw);
  } catch {
    return {
      headline: "Global Sports Report is updating.",
      snapshot:
        "The latest sports report is being generated. Please check back shortly.",
      key_storylines: [],
      sections: [],
      updated_at: new Date().toISOString(),
    };
  }
}

function asArray(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === "object") return Object.values(value);
  return [];
}

function cleanText(value: any): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
}

function getReportSections(report: JsonObject): any[] {
  const raw = report.sections || report.leagues || report.reports || [];
  return asArray(raw).filter(Boolean);
}

function getSectionTitle(section: JsonObject, index: number): string {
  return (
    cleanText(section.title) ||
    cleanText(section.league) ||
    cleanText(section.name) ||
    `Sports Section ${index + 1}`
  );
}

function getStorylines(section: JsonObject): string[] {
  const items =
    section.key_storylines ||
    section.key_data_points ||
    section.storylines ||
    section.items ||
    [];

  return asArray(items)
    .map((item) => {
      if (typeof item === "string") return item;
      return (
        cleanText(item.text) ||
        cleanText(item.title) ||
        cleanText(item.headline) ||
        cleanText(item.value)
      );
    })
    .filter(Boolean);
}

function splitContent(content: string): string[] {
  return content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 8);
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-red-700">
      {children}
    </span>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-neutral-200 bg-white p-6 text-neutral-950 shadow-xl ${className}`}
    >
      {children}
    </section>
  );
}

function VideoCard() {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-neutral-200 bg-neutral-950 px-5 py-4">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-red-400">
          Live Video
        </p>
        <h2 className="mt-1 text-lg font-black text-white">
          Sports News Stream
        </h2>
      </div>

      <div className="aspect-video w-full bg-black">
        <iframe
          src={VIDEO_URL}
          title="Global Sports Report Live Video"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
        />
      </div>
    </Card>
  );
}

function Header({ report }: { report: JsonObject }) {
  const headline =
    cleanText(report.headline) ||
    cleanText(report.title) ||
    "Global Sports Report";

  const snapshot =
    cleanText(report.snapshot) ||
    cleanText(report.body) ||
    "Live sports intelligence, scores, storylines and newsroom-ready context.";

  const updated =
    cleanText(report.updated_at) ||
    cleanText(report.generated_at) ||
    cleanText(report.published_at);

  return (
    <header className="border-b border-neutral-800 bg-neutral-950 text-white">
      <div className="mx-auto max-w-7xl px-5 py-8">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-4 flex flex-wrap gap-3">
              <span className="rounded-full bg-red-700 px-4 py-1 text-xs font-black uppercase tracking-[0.25em] text-white">
                Global Sports Report
              </span>
              <span className="rounded-full border border-white/20 px-4 py-1 text-xs font-bold uppercase tracking-[0.25em] text-white/80">
                Built for journalists
              </span>
            </div>

            <h1 className="max-w-4xl text-4xl font-black leading-tight text-white md:text-6xl">
              {headline}
            </h1>

            <p className="mt-5 max-w-3xl text-lg leading-8 text-neutral-200">
              {snapshot}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={SITE.substack}
                className="rounded-full bg-white px-5 py-3 text-sm font-black text-neutral-950 transition hover:bg-red-100"
              >
                Subscribe on Substack
              </a>
              <a
                href={`https://twitter.com/${SITE.xHandle.replace("@", "")}`}
                className="rounded-full border border-white/30 px-5 py-3 text-sm font-black text-white transition hover:bg-white hover:text-neutral-950"
              >
                Follow {SITE.xHandle}
              </a>
            </div>

            {updated && (
              <p className="mt-5 text-sm font-semibold text-neutral-400">
                Updated: {updated}
              </p>
            )}
          </div>

          <VideoCard />
        </div>
      </div>
    </header>
  );
}

function TopStorylines({ report }: { report: JsonObject }) {
  const storylines = asArray(
    report.key_storylines || report.key_data_points || report.storylines || []
  )
    .map((item) => {
      if (typeof item === "string") return item;
      return cleanText(item.text) || cleanText(item.title) || cleanText(item.headline);
    })
    .filter(Boolean)
    .slice(0, 6);

  if (!storylines.length) return null;

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Badge>Top Storylines</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {storylines.map((item, index) => (
          <div
            key={`${item}-${index}`}
            className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-neutral-950"
          >
            <p className="text-sm font-bold leading-6 text-neutral-900">
              {item}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SectionCard({
  section,
  index,
}: {
  section: JsonObject;
  index: number;
}) {
  const title = getSectionTitle(section, index);
  const headline = cleanText(section.headline);
  const snapshot = cleanText(section.snapshot);
  const content = cleanText(section.content || section.body || section.report);
  const storylines = getStorylines(section);
  const updated = cleanText(section.updated_at || section.generated_at);

  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge>{title}</Badge>

          {headline && (
            <h2 className="mt-4 text-2xl font-black leading-tight text-neutral-950">
              {headline}
            </h2>
          )}
        </div>

        {updated && (
          <p className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-700">
            {updated}
          </p>
        )}
      </div>

      {snapshot && (
        <p className="mb-5 text-base font-semibold leading-7 text-neutral-800">
          {snapshot}
        </p>
      )}

      {storylines.length > 0 && (
        <div className="mb-5 space-y-3">
          {storylines.slice(0, 6).map((item, i) => (
            <div
              key={`${title}-story-${i}`}
              className="border-l-4 border-red-700 bg-neutral-50 px-4 py-3"
            >
              <p className="text-sm font-bold leading-6 text-neutral-950">
                {item}
              </p>
            </div>
          ))}
        </div>
      )}

      {content && (
        <div className="space-y-4">
          {splitContent(content).map((paragraph, i) => (
            <p key={`${title}-content-${i}`} className="text-sm leading-7 text-neutral-800">
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}

function Footer() {
  return (
    <footer className="border-t border-neutral-800 bg-neutral-950 px-5 py-8 text-center text-sm text-neutral-400">
      <p className="font-semibold text-white">{SITE.name}</p>
      <p className="mt-1">{SITE.tagline}</p>
      <p className="mt-3">
        © {new Date().getFullYear()} Global Sports Report LLC
      </p>
    </footer>
  );
}

export default function Home() {
  const report = readReport();
  const sections = getReportSections(report);

  return (
    <main className="min-h-screen bg-neutral-950">
      <Header report={report} />

      <div className="mx-auto max-w-7xl space-y-6 px-5 py-8">
        <TopStorylines report={report} />

        {sections.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            {sections.map((section, index) => (
              <SectionCard
                key={`${getSectionTitle(section, index)}-${index}`}
                section={section}
                index={index}
              />
            ))}
          </div>
        ) : (
          <Card>
            <Badge>Report Updating</Badge>
            <h2 className="mt-4 text-2xl font-black text-neutral-950">
              Latest report is being generated.
            </h2>
            <p className="mt-3 text-neutral-800">
              Global Sports Report will refresh as soon as the newest JSON data
              is available.
            </p>
          </Card>
        )}
      </div>

      <Footer />
    </main>
  );
}