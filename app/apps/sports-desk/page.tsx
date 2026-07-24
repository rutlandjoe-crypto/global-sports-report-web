import fs from "fs";
import path from "path";
import type { Metadata } from "next";
import Link from "next/link";
import LeagueDesk from "@/components/sports-desk/LeagueDesk";

type JsonObject = Record<string, unknown>;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "GSR Sports Desk | Global Sports Report",
  description:
    "MLB headlines, scores, standings and editorial context from Global Sports Report.",
  alternates: {
    canonical: "https://www.globalsportsreport.com/apps/sports-desk",
  },
};

function readReport(): JsonObject {
  try {
    const reportPath = path.join(process.cwd(), "public", "latest_report.json");
    return JSON.parse(fs.readFileSync(reportPath, "utf8")) as JsonObject;
  } catch {
    return {};
  }
}

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function freshestUpdate(report: JsonObject): string {
  const mlb = object(object(report.sections).mlb);
  const raw =
    text(mlb.updated_at) ||
    text(mlb.generated_at) ||
    text(mlb.published_at) ||
    text(report.updated_at) ||
    text(report.generated_at) ||
    text(report.published_at);
  return raw.replace(/\bEST\b|\bEDT\b/i, "ET");
}

export default function SportsDeskPage() {
  const report = readReport();
  const updated = freshestUpdate(report);

  return (
    <main className="min-h-screen overflow-x-hidden bg-neutral-100 text-neutral-950">
      <div className="border-b border-neutral-800 bg-black text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wide sm:px-5">
          <Link href="/" className="hover:text-red-300">
            ← Global Sports Report
          </Link>
          <span className="text-red-300">Phase 1: MLB</span>
        </div>
      </div>

      <header className="border-b border-neutral-300 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-10">
          <p className="text-sm font-black uppercase tracking-wide text-red-700">
            Global Sports Report
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
            GSR Sports Desk
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-700">
            Scores, headlines and editorial context from Global Sports Report.
          </p>
          {updated ? (
            <p className="mt-4 text-sm font-bold text-neutral-500">
              Updated: {updated}
            </p>
          ) : null}
        </div>
      </header>

      <nav
        aria-label="Sports Desk sections"
        className="border-b border-neutral-300 bg-white"
      >
        <div className="mx-auto flex max-w-7xl gap-x-5 gap-y-2 overflow-x-auto px-4 py-3 text-sm font-black text-neutral-700 sm:flex-wrap sm:px-5">
          <a href="#top-stories" className="shrink-0 hover:text-red-700">
            Top Stories
          </a>
          <a href="#scoreboard" className="shrink-0 hover:text-red-700">
            Scoreboard
          </a>
          <a href="#pennant-race" className="shrink-0 hover:text-red-700">
            Pennant Race
          </a>
          <a href="#editorial-standards" className="shrink-0 hover:text-red-700">
            Editorial Standards
          </a>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl space-y-7 px-4 py-6 sm:px-5 sm:py-8">
        <aside
          aria-label="Sponsor opportunity"
          className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm"
        >
          <p className="text-xs font-black uppercase tracking-wide text-neutral-500">
            GSR Sports Desk presented by
          </p>
          <p className="mt-2 text-lg font-black text-neutral-900">
            Sponsor opportunity available
          </p>
        </aside>

        <LeagueDesk leagueKey="mlb" leagueName="MLB" report={report} />

        <section
          id="editorial-standards"
          className="scroll-mt-4 rounded-2xl border border-neutral-800 bg-neutral-950 p-5 text-white sm:p-6"
        >
          <h2 className="text-xl font-black">Editorial Standards</h2>
          <ul className="mt-4 grid gap-2 text-sm leading-6 text-neutral-300 sm:grid-cols-2">
            <li>Source headlines are preserved.</li>
            <li>AI assists with data, signals and structure.</li>
            <li>Final journalism remains human-directed.</li>
            <li>Scores and standings are presented with editorial context.</li>
          </ul>
        </section>
      </div>

      <footer className="border-t border-neutral-300 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-neutral-600 sm:px-5">
          <Link href="/" className="font-bold text-red-700 hover:underline">
            Back to Global Sports Report
          </Link>
        </div>
      </footer>
    </main>
  );
}
