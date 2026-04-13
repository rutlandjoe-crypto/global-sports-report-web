import fs from "fs";
import path from "path";

type ReportSection = {
  name: string;
  content: string;
};

type ReportData = {
  title: string;
  headline?: string;
  updated_at?: string;
  edition?: string;
  disclaimer?: string;
  key_storylines?: string[];
  full_report?: string;
  sections?: ReportSection[];
};

function readReportData(): ReportData | null {
  try {
    const filePath = path.join(process.cwd(), "public", "latest_report.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    console.error("Failed to read latest_report.json:", error);
    return null;
  }
}

export const dynamic = "force-dynamic";

/* ---------------- UTILS ---------------- */

function cleanText(value: string | undefined | null): string {
  if (!value) return "";
  return value
    .replace(/\r/g, "")
    .replace(/â€™/g, "’")
    .replace(/â€œ/g, "“")
    .replace(/â€/g, "”")
    .replace(/â€"/g, "—")
    .replace(/â€“/g, "–")
    .replace(/\t/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .trim();
}

function splitLines(value: string | undefined | null): string[] {
  return cleanText(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function normalizeForMatch(value: string): string {
  return cleanText(value).toLowerCase();
}

function dedupe(lines: string[]): string[] {
  return [...new Set(lines.map((l) => cleanText(l)).filter(Boolean))];
}

/* ---------------- DATA HELPERS ---------------- */

function getSections(report: ReportData): ReportSection[] {
  if (!Array.isArray(report.sections)) return [];
  return report.sections.map((s) => ({
    name: cleanText(s.name),
    content: cleanText(s.content),
  }));
}

function getLeagueBadge(name: string): string {
  const key = normalizeForMatch(name);
  if (key.includes("mlb")) return "MLB";
  if (key.includes("nba")) return "NBA";
  if (key.includes("nfl")) return "NFL";
  if (key.includes("nhl")) return "NHL";
  if (key.includes("soccer")) return "SOCCER";
  if (key.includes("fantasy")) return "FANTASY";
  if (key.includes("betting")) return "BETTING";
  return "SECTION";
}

function getLeagueColor(name: string): string {
  const key = normalizeForMatch(name);
  if (key.includes("mlb")) return "border-blue-300 bg-blue-50";
  if (key.includes("nba")) return "border-sky-300 bg-sky-50";
  if (key.includes("nfl")) return "border-indigo-300 bg-indigo-50";
  if (key.includes("nhl")) return "border-cyan-300 bg-cyan-50";
  if (key.includes("soccer")) return "border-teal-300 bg-teal-50";
  if (key.includes("fantasy")) return "border-violet-300 bg-violet-50";
  if (key.includes("betting")) return "border-emerald-300 bg-emerald-50";
  return "border-slate-300 bg-white";
}

function findMatches(lines: string[], query: string): string[] {
  const q = normalizeForMatch(query);
  return lines.filter((l) => normalizeForMatch(l).includes(q)).slice(0, 6);
}

/* ---------------- PAGE ---------------- */

export default async function HomePage({ searchParams }: any) {
  const query = cleanText(searchParams?.q || "");
  const report = readReportData();

  if (!report) {
    return <main className="p-8">Could not load report.</main>;
  }

  const sections = getSections(report);

  const headline =
    cleanText(report.headline) ||
    "Automated sports journalism support for the modern newsroom.";

  const updatedAt =
    cleanText(report.updated_at) || "Update time unavailable";

  const topStorylines = (report.key_storylines || []).map(cleanText);

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6">

        {/* HEADER */}
        <header className="rounded-3xl bg-slate-900 text-white p-6">
          <h1 className="text-4xl font-bold">{report.title}</h1>
          <p className="mt-3 text-lg text-slate-300">{headline}</p>
          <div className="mt-3 text-sm text-slate-400">{updatedAt}</div>
        </header>

        {/* SEARCH */}
        <section className="mt-6 bg-white p-6 rounded-3xl shadow">
          <h2 className="text-xl font-bold">Search Center</h2>

          <form className="mt-4 flex gap-3">
            <input
              name="q"
              defaultValue={query}
              placeholder="Search players, teams, leagues, or topics"
              className="flex-1 border p-3 rounded-xl"
            />
            <button className="bg-blue-700 text-white px-4 rounded-xl">
              Search
            </button>
          </form>

          {/* ✅ FINAL CLEAN TEXT */}
          <div className="mt-4 text-sm text-slate-600">
            Search the latest GSR report by player, team, league, or topic.
          </div>
        </section>

        {/* STORYLINES */}
        <section className="mt-6 bg-white p-6 rounded-3xl shadow">
          <h2 className="text-xl font-bold">Top Storylines</h2>

          <div className="mt-4 space-y-2">
            {topStorylines.map((s, i) => (
              <div key={i} className="bg-slate-50 p-3 rounded-xl">
                {s}
              </div>
            ))}
          </div>
        </section>

        {/* SECTIONS */}
        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          {sections.map((section) => {
            const lines = splitLines(section.content);
            const matches = query ? findMatches(lines, query) : lines.slice(0, 6);

            return (
              <div
                key={section.name}
                className={`p-5 rounded-3xl border ${getLeagueColor(section.name)}`}
              >
                <div className="mb-2 text-xs font-bold uppercase">
                  {getLeagueBadge(section.name)}
                </div>

                <h3 className="text-lg font-bold mb-3">
                  {section.name}
                </h3>

                <div className="space-y-2">
                  {matches.map((line, i) => (
                    <div key={i} className="bg-white p-2 rounded">
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </section>

        {/* FOOTER */}
        <footer className="mt-6 bg-slate-900 text-white p-4 rounded-3xl">
          {report.disclaimer ||
            "This report is an automated summary intended to support, not replace, human sports journalism."}
        </footer>

      </div>
    </main>
  );
}