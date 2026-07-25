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
  title: "NFL Desk | Global Sports Report",
  description:
    "NFL news, scores, standings, analysis, and context from Global Sports Report.",
  alternates: {
    canonical: "https://www.globalsportsreport.com/apps/nfl",
  },
};

const NFL_DESK_CONFIG = {
  slug: "nfl",
  sport: "football",
  headlinesTitle: "Latest NFL Headlines",
  scoreboardTitle: "NFL Scoreboard",
  scoreboardEmpty:
    "There are no verified NFL games in the current report. Upcoming games and results will appear here when they are available.",
  standingsTitle: "NFL Standings",
  standingsAnchor: "standings",
  standingsEmpty:
    "Verified NFL standings are not available in the current report. Conference and division records will appear here when the data feed supports them.",
  fallbackHeadline: "The NFL questions shaping the season ahead",
  fallbackSummary:
    "A continuing editorial look at roster construction, schedule pressure, coaching decisions, and the league-wide themes that will matter when verified developments are available.",
  fallbackHeadlines: [
    {
      label: "Division outlooks",
      headline: "How division outlooks take shape",
      summary:
        "A coverage lane for schedule strength, roster balance, and the variables that define each division.",
    },
    {
      label: "Quarterback decisions",
      headline: "Quarterback decisions and roster direction",
      summary:
        "A continuing focus on depth-chart clarity, development timelines, and how teams build around the position.",
    },
    {
      label: "Roster construction",
      headline: "The roster-building choices behind the headlines",
      summary:
        "Context on depth, contracts, positional value, and the decisions that shape a 53-player roster.",
    },
    {
      label: "Coaching developments",
      headline: "Coaching changes, systems, and team identity",
      summary:
        "Analysis of how scheme, staffing, and organizational direction affect the football operation.",
    },
    {
      label: "League business",
      headline: "The business forces moving professional football",
      summary:
        "Coverage of media, labor, governance, and commercial developments across the league.",
    },
    {
      label: "Playoff structure",
      headline: "Understanding the path to the postseason",
      summary:
        "A framework for following division races, conference positioning, and playoff implications as verified results arrive.",
    },
    {
      label: "Draft analysis",
      headline: "Draft decisions through a roster-building lens",
      summary:
        "Prospect and team-fit analysis centered on long-term roster needs rather than unsupported projections.",
    },
  ],
} satisfies LeagueDeskConfig;

const STORYLINES = [
  {
    title: "Division Races",
    description:
      "Schedule pressure, head-to-head context, and the roster strengths that shape each division.",
  },
  {
    title: "Quarterback Decisions",
    description:
      "Starter clarity, development plans, scheme fit, and the downstream effect on the offense.",
  },
  {
    title: "Injuries and Roster Movement",
    description:
      "Verified availability news, depth-chart consequences, and the roster response.",
  },
  {
    title: "Coaching and Front-Office Developments",
    description:
      "Leadership decisions, system changes, personnel strategy, and organizational direction.",
  },
  {
    title: "League Business and Media",
    description:
      "Media rights, labor, governance, audience trends, and the economics surrounding the game.",
  },
  {
    title: "Playoff Implications",
    description:
      "Conference position, tiebreaker context, and the stakes attached to verified results.",
  },
] as const;

export default function NflDeskPage() {
  const report = readSportsReport();
  const updated = freshestLeagueUpdate(report, "nfl");

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
            NFL Desk
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-700">
            NFL news, scores, standings, analysis, and context from Global
            Sports Report.
          </p>
          {updated ? (
            <p className="mt-4 text-sm font-bold text-neutral-500">
              Latest report update: {updated}
            </p>
          ) : null}
        </div>
      </header>

      <nav
        aria-label="NFL Desk sections"
        className="sticky top-0 z-10 border-b border-neutral-300 bg-white/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl gap-x-5 overflow-x-auto px-4 py-3 text-sm font-black text-neutral-700 sm:px-5">
          <a href="#top-stories" className="shrink-0 hover:text-red-700">
            Top Stories
          </a>
          <a href="#scoreboard" className="shrink-0 hover:text-red-700">
            Scoreboard
          </a>
          <a href="#standings" className="shrink-0 hover:text-red-700">
            Standings
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
              Sponsor the NFL Desk
            </p>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600 sm:mt-0">
            Reach readers following professional football throughout the season.
            Advertising opportunities available.
          </p>
        </aside>

        <LeagueDesk
          leagueKey="nfl"
          leagueName="NFL"
          report={report}
          config={NFL_DESK_CONFIG}
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
            GSR goes beyond the headline. The NFL Desk connects league
            developments to division races, roster construction, playoff
            implications, fantasy football, media, and the business of
            professional football.
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
            <li>Unsupported rumors are not published merely to generate traffic.</li>
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
