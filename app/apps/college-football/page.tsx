import type { Metadata } from "next";
import Link from "next/link";
import LeagueDesk, {
  type LeagueDeskConfig,
} from "@/components/sports-desk/LeagueDesk";
import SportsNetworkGrowth from "@/components/sports-desk/SportsNetworkGrowth";
import {
  freshestLeagueUpdate,
  readSportsReport,
} from "@/app/apps/report";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "College Football Desk | Global Sports Report",
  description:
    "College football news, scores, rankings, analysis, and context from Global Sports Report.",
  alternates: {
    canonical: "https://www.globalsportsreport.com/apps/college-football",
  },
};

const COLLEGE_FOOTBALL_DESK_CONFIG = {
  slug: "college-football",
  sport: "college-football",
  headlinesTitle: "Latest College Football Headlines",
  scoreboardTitle: "College Football Scoreboard",
  scoreboardEmpty:
    "There are no verified college football games in the current report. Upcoming games and results will appear here when they are available.",
  standingsTitle: "College Football Rankings",
  standingsAnchor: "rankings",
  standingsEmpty:
    "Verified college football rankings are not available in the current report. Official poll information will appear here when the data feed supports it.",
  fallbackHeadline: "The questions shaping college football’s season ahead",
  fallbackSummary:
    "A continuing editorial look at conference races, program direction, playoff implications, and the forces reshaping the sport when verified developments are available.",
  fallbackHeadlines: [
    {
      label: "Conference races",
      headline: "How conference races take shape",
      summary:
        "A coverage lane for schedule pressure, program depth, and the variables that influence each conference.",
    },
    {
      label: "Playoff implications",
      headline: "Following the path to the College Football Playoff",
      summary:
        "Context for understanding conference results, selection pressure, and postseason positioning as verified games arrive.",
    },
    {
      label: "Quarterback competitions",
      headline: "Quarterback competitions and program direction",
      summary:
        "A continuing focus on development, scheme fit, depth-chart decisions, and their effect on an offense.",
    },
    {
      label: "Transfer portal",
      headline: "The transfer portal through a roster-building lens",
      summary:
        "Analysis of verified movement and how programs address depth, experience, and positional needs.",
    },
    {
      label: "Recruiting strategy",
      headline: "Recruiting strategy beyond the rankings",
      summary:
        "Coverage of roster fit, development plans, regional priorities, and long-term program building.",
    },
    {
      label: "Conference realignment",
      headline: "How realignment changes the competitive map",
      summary:
        "Context on scheduling, travel, rivalries, media, and the structural future of college football.",
    },
    {
      label: "Program rebuilding",
      headline: "The decisions behind a program rebuild",
      summary:
        "A coverage framework for leadership, player development, roster balance, and institutional expectations.",
    },
  ],
} satisfies LeagueDeskConfig;

const STORYLINES = [
  {
    title: "Conference Races",
    description:
      "Schedule pressure, head-to-head context, and the program strengths that shape each conference.",
  },
  {
    title: "College Football Playoff",
    description:
      "Selection context, postseason positioning, and the implications attached to verified results.",
  },
  {
    title: "Quarterback Competitions",
    description:
      "Development, scheme fit, depth-chart clarity, and the effect on an offense’s direction.",
  },
  {
    title: "Transfer Portal",
    description:
      "Verified player movement, roster needs, eligibility context, and program response.",
  },
  {
    title: "Recruiting",
    description:
      "Program strategy, roster fit, development plans, and long-term talent building.",
  },
  {
    title: "Coaching and Program Direction",
    description:
      "Leadership, systems, player development, and the choices that define a program.",
  },
  {
    title: "Rivalries",
    description:
      "The history, regional stakes, and competitive context behind the sport’s defining games.",
  },
  {
    title: "Conference Realignment",
    description:
      "Scheduling, travel, competitive balance, and the changing structure of the sport.",
  },
  {
    title: "Media and the Business of College Football",
    description:
      "Media rights, governance, revenue, audience trends, and the economics around the game.",
  },
] as const;

export default function CollegeFootballDeskPage() {
  const report = readSportsReport();
  const updated = freshestLeagueUpdate(report, "ncaafb");

  return (
    <main className="min-h-screen overflow-x-hidden bg-neutral-100 text-neutral-950">
      <div className="border-b border-neutral-800 bg-black text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs font-bold uppercase tracking-wide sm:px-5">
          <Link href="/" className="hover:text-red-300">
            ← Global Sports Report
          </Link>
          <Link
            href="/apps/sports-desk"
            className="text-neutral-300 hover:text-white"
          >
            GSR Sports Desk
          </Link>
        </div>
      </div>

      <header className="border-b border-neutral-300 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-5 sm:py-11">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-black uppercase tracking-wide text-red-700">
              Global Sports Report
            </p>
            <span className="rounded-full border border-neutral-300 bg-neutral-50 px-3 py-1 text-xs font-bold text-neutral-600">
              Updated regularly
            </span>
          </div>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
            College Football Desk
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-700">
            College football news, scores, rankings, analysis, and context from
            Global Sports Report.
          </p>
          {updated ? (
            <p className="mt-4 text-sm font-bold text-neutral-500">
              Latest report update: {updated}
            </p>
          ) : null}
        </div>
      </header>

      <nav
        aria-label="College Football Desk sections"
        className="sticky top-0 z-10 border-b border-neutral-300 bg-white/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl gap-x-5 overflow-x-auto px-4 py-3 text-sm font-black text-neutral-700 sm:px-5">
          <a href="#top-stories" className="shrink-0 hover:text-red-700">
            Top Stories
          </a>
          <a href="#scoreboard" className="shrink-0 hover:text-red-700">
            Scoreboard
          </a>
          <a href="#rankings" className="shrink-0 hover:text-red-700">
            Rankings
          </a>
          <a href="#key-storylines" className="shrink-0 hover:text-red-700">
            Key Storylines
          </a>
          <a href="#editorial-standards" className="shrink-0 hover:text-red-700">
            Editorial Standards
          </a>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl space-y-7 px-4 py-6 sm:px-5 sm:py-8">
        <aside
          aria-label="Sponsor opportunity"
          className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-6"
        >
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-neutral-500">
              Partner with Global Sports Report
            </p>
            <p className="mt-2 text-lg font-black text-neutral-900">
              Sponsor the College Football Desk
            </p>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600 sm:mt-0">
            Reach readers following programs, conferences, rivalries, rankings,
            and the national championship race. Advertising opportunities
            available.
          </p>
        </aside>

        <LeagueDesk
          leagueKey="ncaafb"
          leagueName="College Football"
          report={report}
          config={COLLEGE_FOOTBALL_DESK_CONFIG}
        />

        <section
          id="key-storylines"
          aria-labelledby="key-storylines-heading"
          className="scroll-mt-16"
        >
          <p className="gsr-section-label">Coverage lanes</p>
          <h2 id="key-storylines-heading" className="mt-2 text-2xl font-black">
            Key Storylines
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {STORYLINES.map((storyline) => (
              <article key={storyline.title} className="gsr-card p-5">
                <h3 className="text-lg font-black">{storyline.title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-700">
                  {storyline.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <aside
          aria-labelledby="why-it-matters-heading"
          className="rounded-2xl border-l-4 border-red-700 bg-neutral-950 p-6 text-white sm:p-8"
        >
          <p className="text-xs font-black uppercase tracking-[0.18em] text-red-300">
            GSR perspective
          </p>
          <h2 id="why-it-matters-heading" className="mt-2 text-2xl font-black">
            Why It Matters
          </h2>
          <p className="mt-3 max-w-4xl text-base leading-7 text-neutral-300">
            GSR goes beyond the final score. The College Football Desk connects
            games and program developments to conference races, playoff
            implications, recruiting, the transfer portal, coaching decisions,
            media, and the business of the sport.
          </p>
        </aside>

        <section
          id="editorial-standards"
          className="scroll-mt-16 rounded-2xl border border-neutral-800 bg-neutral-950 p-5 text-white sm:p-7"
        >
          <p className="text-xs font-black uppercase tracking-[0.18em] text-red-300">
            Our newsroom
          </p>
          <h2 className="mt-2 text-2xl font-black">Editorial Standards</h2>
          <p className="mt-3 max-w-4xl leading-7 text-neutral-300">
            Global Sports Report values accuracy, context, and transparency in
            every format.
          </p>
          <ul className="mt-5 grid gap-3 text-sm leading-6 text-neutral-300 md:grid-cols-2">
            <li>We rely on trusted sourcing and verify information before publication.</li>
            <li>Reporting, analysis, and opinion are identified and kept distinct.</li>
            <li>Material errors are corrected clearly when they are discovered.</li>
            <li>
              Unsupported recruiting, transfer, injury, or coaching rumors are
              not published merely to generate traffic.
            </li>
          </ul>
        </section>

        <SportsNetworkGrowth />
      </div>

      <footer className="border-t border-neutral-300 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-neutral-600 sm:px-5">
          <Link href="/" className="font-bold text-red-700 hover:underline">
            Back to Global Sports Report
          </Link>
          <Link
            href="/apps/sports-desk"
            className="font-bold hover:text-red-700"
          >
            Visit the GSR Sports Desk
          </Link>
        </div>
      </footer>
    </main>
  );
}
