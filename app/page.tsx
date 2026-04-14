import fs from "fs";
import path from "path";

type AdvancedReportSections = {
  statcast_watch?: string[];
  matchup_flags?: string[];
  pitcher_signals?: string[];
  hitter_signals?: string[];
  bullpen_signals?: string[];
  team_trends?: string[];
  betting_signals?: string[];
  editors_note?: string[];
  editor_s_note?: string[];
  [key: string]: string[] | undefined;
};

type AdvancedReport = {
  title?: string;
  source_file?: string;
  updated_at?: string;
  sections?: AdvancedReportSections;
};

type ReportSection = {
  name: string;
  content: string;
  advanced?: AdvancedReport;
};

type ReportData = {
  title: string;
  headline?: string;
  key_storylines?: string[];
  snapshot?: string;
  sections?: ReportSection[];
  full_report?: string;
  updated_at?: string;
  disclaimer?: string;
};

function readReportData(): ReportData | null {
  try {
    const filePath = path.join(process.cwd(), "public", "latest_report.json");
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as ReportData;

    return {
      title: parsed.title || "GLOBAL SPORTS REPORT",
      headline: parsed.headline || "",
      key_storylines: Array.isArray(parsed.key_storylines)
        ? parsed.key_storylines
        : [],
      snapshot: parsed.snapshot || "",
      sections: Array.isArray(parsed.sections) ? parsed.sections : [],
      full_report: parsed.full_report || "",
      updated_at: parsed.updated_at || "",
      disclaimer: parsed.disclaimer || "",
    };
  } catch (error) {
    console.error("Failed to read latest_report.json:", error);
    return null;
  }
}

function formatSectionContent(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function sectionTone(name: string): string {
  switch (name.toUpperCase()) {
    case "MLB":
      return "border-blue-200 bg-blue-50";
    case "NBA":
      return "border-orange-200 bg-orange-50";
    case "NHL":
      return "border-sky-200 bg-sky-50";
    case "NFL":
      return "border-emerald-200 bg-emerald-50";
    case "SOCCER":
      return "border-lime-200 bg-lime-50";
    case "FANTASY":
      return "border-violet-200 bg-violet-50";
    case "BETTING ODDS":
      return "border-rose-200 bg-rose-50";
    default:
      return "border-slate-200 bg-white";
  }
}

function advancedTone(name: string): string {
  switch (name.toUpperCase()) {
    case "MLB":
      return "border-indigo-200 bg-indigo-50";
    case "NBA":
      return "border-amber-200 bg-amber-50";
    case "NHL":
      return "border-cyan-200 bg-cyan-50";
    case "NFL":
      return "border-teal-200 bg-teal-50";
    default:
      return "border-slate-200 bg-slate-50";
  }
}

function formatAdvancedHeading(key: string): string {
  const normalized = key
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  return normalized;
}

function getAdvancedSectionEntries(
  advanced?: AdvancedReport
): Array<[string, string[]]> {
  if (!advanced?.sections || typeof advanced.sections !== "object") {
    return [];
  }

  const orderedKeys = [
    "statcast_watch",
    "matchup_flags",
    "pitcher_signals",
    "hitter_signals",
    "bullpen_signals",
    "team_trends",
    "betting_signals",
    "editors_note",
    "editor_s_note",
  ];

  const usedKeys = new Set<string>();
  const entries: Array<[string, string[]]> = [];

  for (const key of orderedKeys) {
    const value = advanced.sections[key];
    if (Array.isArray(value) && value.length > 0) {
      entries.push([key, value]);
      usedKeys.add(key);
    }
  }

  for (const [key, value] of Object.entries(advanced.sections)) {
    if (usedKeys.has(key)) {
      continue;
    }

    if (Array.isArray(value) && value.length > 0) {
      entries.push([key, value]);
    }
  }

  return entries;
}

function hasAdvancedContent(advanced?: AdvancedReport): boolean {
  return getAdvancedSectionEntries(advanced).length > 0;
}

export default function HomePage() {
  const report = readReportData();

  if (!report) {
    return (
      <main className="min-h-screen bg-slate-100 text-slate-900">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="rounded-3xl border border-red-200 bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-black tracking-tight">
              Global Sports Report
            </h1>
            <p className="mt-4 text-base text-slate-700">
              The report feed could not be loaded from{" "}
              <span className="font-semibold">public/latest_report.json</span>.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const {
    title,
    headline,
    key_storylines,
    snapshot,
    sections,
    full_report,
    updated_at,
    disclaimer,
  } = report;

  const sectionCount = sections?.length ?? 0;
  const advancedSectionCount =
    sections?.filter((section) => hasAdvancedContent(section.advanced)).length ??
    0;

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-4xl">
              <div className="mb-2 inline-flex rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
                Automated newsroom feed
              </div>

              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                {title}
              </h1>

              {headline ? (
                <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-700">
                  {headline}
                </p>
              ) : null}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold text-slate-900">Latest update</div>
              <div className="mt-1">{updated_at || "Unavailable"}</div>
            </div>
          </div>

          {key_storylines && key_storylines.length > 0 ? (
            <section className="mt-6">
              <h2 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                Key Storylines
              </h2>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {key_storylines.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
                  >
                    <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
                      Line {index + 1}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-800">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {snapshot ? (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">
                Snapshot
              </div>
              <p className="mt-2 text-base font-medium text-slate-800">
                {snapshot}
              </p>
            </section>
          ) : null}
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-5">
            {sections && sections.length > 0 ? (
              sections.map((section) => {
                const lines = formatSectionContent(section.content);
                const advancedEntries = getAdvancedSectionEntries(
                  section.advanced
                );

                return (
                  <article
                    key={section.name}
                    className={`rounded-3xl border p-5 shadow-sm ${sectionTone(
                      section.name
                    )}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h2 className="text-2xl font-black tracking-tight">
                        {section.name}
                      </h2>
                      <div className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-600">
                        Section
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      {lines.map((line, index) => {
                        const isLabel =
                          line === "SNAPSHOT" ||
                          line === "FINAL SCORES" ||
                          line === "LIVE" ||
                          line === "UPCOMING" ||
                          line === "TOP BOARD" ||
                          line === "GLOBAL SNAPSHOT" ||
                          line === "FALLBACK NOTE" ||
                          line === "BETTING MARKET NOTE";

                        return isLabel ? (
                          <div
                            key={`${section.name}-${index}`}
                            className="pt-3 text-xs font-black uppercase tracking-[0.18em] text-slate-500"
                          >
                            {line}
                          </div>
                        ) : (
                          <p
                            key={`${section.name}-${index}`}
                            className="text-sm leading-7 text-slate-800"
                          >
                            {line}
                          </p>
                        );
                      })}
                    </div>

                    {advancedEntries.length > 0 ? (
                      <section
                        className={`mt-6 rounded-3xl border p-5 shadow-sm ${advancedTone(
                          section.name
                        )}`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                              Advanced Metrics
                            </div>
                            <h3 className="mt-2 text-xl font-black tracking-tight text-slate-900">
                              {section.advanced?.title || `${section.name} ADVANCED REPORT`}
                            </h3>
                          </div>

                          <div className="rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-600">
                            <div className="font-bold uppercase tracking-[0.18em] text-slate-500">
                              Updated
                            </div>
                            <div className="mt-1 font-semibold text-slate-900">
                              {section.advanced?.updated_at || updated_at || "Unavailable"}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-4">
                          {advancedEntries.map(([key, items]) => (
                            <div
                              key={`${section.name}-${key}`}
                              className="rounded-2xl border border-slate-200 bg-white p-4"
                            >
                              <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                                {formatAdvancedHeading(key)}
                              </div>

                              <div className="mt-3 space-y-3">
                                {items.map((item, index) => (
                                  <div
                                    key={`${section.name}-${key}-${index}`}
                                    className="text-sm leading-7 text-slate-800"
                                  >
                                    <span className="mr-2 font-bold text-slate-500">
                                      -
                                    </span>
                                    {item}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-black tracking-tight">
                  Daily Report
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  No section data is currently available.
                </p>
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black tracking-tight">
                Report Status
              </h2>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Sections loaded
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900">
                    {sectionCount}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Advanced sections
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-900">
                    {advancedSectionCount}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                    Last updated
                  </div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">
                    {updated_at || "Unavailable"}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-black tracking-tight">
                Full Report Feed
              </h2>

              {full_report ? (
                <pre className="mt-4 max-h-[900px] overflow-auto whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-950 p-4 text-xs leading-6 text-slate-100">
                  {full_report}
                </pre>
              ) : (
                <p className="mt-4 text-sm leading-7 text-slate-700">
                  Full report text is not currently available.
                </p>
              )}
            </section>

            {disclaimer ? (
              <section className="rounded-3xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
                <h2 className="text-sm font-black uppercase tracking-[0.18em] text-blue-700">
                  Editorial Note
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-800">
                  {disclaimer}
                </p>
              </section>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}