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
  title: "Fantasy Sports Desk | Global Sports Report",
  description:
    "Fantasy sports news, rankings, strategy, lineup advice, draft coverage, waiver-wire analysis, and industry insights from Global Sports Report.",
  alternates: {
    canonical: "https://www.globalsportsreport.com/apps/fantasy",
  },
};

const FANTASY_DESK_CONFIG = {
  slug: "fantasy",
  sport: "fantasy",
  headlinesTitle: "Latest Fantasy Sports Headlines",
  scoreboardTitle: "Fantasy Sports Board",
  scoreboardEmpty: "",
  showScoreboard: false,
  standingsTitle: "Fantasy Rankings",
  standingsAnchor: "rankings",
  standingsEmpty:
    "Verified fantasy rankings are not available in the current report. Position, tier, and format-specific rankings will appear here when supported data is available.",
  fallbackHeadline: "Strategy for the full fantasy sports calendar",
  fallbackSummary:
    "An editorial guide to player usage, draft preparation, waiver strategy, analytics, league formats, and the business of fantasy sports without unsupported rankings or recommendations.",
  fallbackHeadlines: [
    {
      label: "Fantasy Football",
      headline: "Fantasy football across the full roster cycle",
      summary:
        "A coverage lane for draft preparation, player usage, waiver strategy, dynasty decisions, and roster construction.",
    },
    {
      label: "Fantasy Baseball",
      headline: "Managing the rhythms of a fantasy baseball season",
      summary:
        "Editorial context on playing time, rotations, bullpen roles, prospects, schedules, and roster management.",
    },
    {
      label: "Fantasy Basketball",
      headline: "Usage, rotations, and fantasy basketball strategy",
      summary:
        "A continuing focus on opportunity, schedule volume, category needs, role changes, and roster balance.",
    },
    {
      label: "Fantasy Hockey",
      headline: "Fantasy hockey through roles and opportunity",
      summary:
        "Coverage of deployment, special-teams usage, goaltending workload, schedules, and roster decisions.",
    },
    {
      label: "DFS",
      headline: "Daily fantasy strategy without sportsbook framing",
      summary:
        "Editorial analysis of contest formats, lineup construction, projections, variance, and responsible decision-making.",
    },
    {
      label: "Dynasty",
      headline: "Long-term roster building in dynasty formats",
      summary:
        "Context on player development, age curves, draft capital, roster windows, and sustainable team construction.",
    },
    {
      label: "Draft Prep",
      headline: "Draft preparation built around tiers and risk",
      summary:
        "A coverage framework for formats, positional value, roster structure, contingency planning, and uncertainty.",
    },
  ],
} satisfies LeagueDeskConfig;

const WAIVER_WIRE_LANES = [
  {
    title: "Trending Players",
    description:
      "Verified changes in role, opportunity, playing time, and usage without unsupported recommendations.",
  },
  {
    title: "Emerging Opportunities",
    description:
      "A coverage lane for sourced depth-chart changes and the situations creating new fantasy relevance.",
  },
  {
    title: "Injury Replacements",
    description:
      "Responsibly sourced availability reporting and the roster context behind replacement opportunities.",
  },
  {
    title: "Streaming Options",
    description:
      "Schedule, role, matchup, and format considerations when verified data supports short-term strategy.",
  },
  {
    title: "Matchup Plays",
    description:
      "A framework for evaluating opponent context without inventing projections or guaranteed outcomes.",
  },
  {
    title: "FAAB Strategy",
    description:
      "Budget, roster need, replacement value, and league-context principles rather than fabricated bid amounts.",
  },
] as const;

const DRAFT_STRATEGY_LANES = [
  {
    title: "Draft Prep",
    description:
      "Format settings, roster requirements, research priorities, and contingency planning.",
  },
  {
    title: "Tier-Based Drafting",
    description:
      "Comparing groups of similarly valued players without presenting unsupported rankings.",
  },
  {
    title: "Best Ball",
    description:
      "Roster construction, correlation, positional depth, and risk across draft-only formats.",
  },
  {
    title: "Dynasty",
    description:
      "Long-term value, age curves, development, draft capital, and competitive windows.",
  },
  {
    title: "Rookie Watch",
    description:
      "Verified roles, development paths, opportunity, and the transition into professional competition.",
  },
  {
    title: "Keeper Strategy",
    description:
      "Cost, opportunity value, league rules, roster windows, and future flexibility.",
  },
  {
    title: "Positional Value",
    description:
      "Scarcity, replacement level, lineup requirements, and how format changes draft priorities.",
  },
  {
    title: "Risk Management",
    description:
      "Balancing uncertainty, injury history, role stability, roster construction, and upside.",
  },
] as const;

const STORYLINES = [
  {
    title: "Fantasy Football",
    description:
      "Drafts, waivers, dynasty, best ball, player usage, and strategy throughout the football calendar.",
  },
  {
    title: "Fantasy Baseball",
    description:
      "Playing time, pitching roles, prospects, categories, schedules, and daily roster management.",
  },
  {
    title: "Fantasy Basketball",
    description:
      "Rotations, usage, schedule volume, categories, player availability, and roster balance.",
  },
  {
    title: "Fantasy Hockey",
    description:
      "Deployment, special teams, goaltending workload, schedules, and opportunity.",
  },
  {
    title: "DFS Industry",
    description:
      "Contest design, responsible play, regulation, platform trends, and industry development.",
  },
  {
    title: "Dynasty Leagues",
    description:
      "Development, age curves, rookie drafts, roster windows, and long-term team construction.",
  },
  {
    title: "Analytics",
    description:
      "Usage, opportunity, projections, uncertainty, model inputs, and responsible interpretation.",
  },
  {
    title: "AI Tools",
    description:
      "Transparent assistance for research and organization without presenting generated claims as verified facts.",
  },
  {
    title: "Draft Technology",
    description:
      "Research tools, league software, mock drafting, format support, and decision workflows.",
  },
  {
    title: "Fantasy Sports Business",
    description:
      "Media, platforms, subscriptions, sponsorship, regulation, audiences, and the economics of the industry.",
  },
] as const;

export default function FantasySportsDeskPage() {
  const report = readSportsReport();
  const updated = freshestLeagueUpdate(report, "fantasy");

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
            Fantasy Sports Desk
          </h1>
          <p className="mt-4 max-w-4xl text-lg leading-8 text-neutral-700">
            Fantasy sports news, rankings, strategy, lineup advice, draft
            coverage, waiver-wire analysis, and industry insights from Global
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
        aria-label="Fantasy Sports Desk sections"
        className="sticky top-0 z-10 border-b border-neutral-300 bg-white/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl gap-x-5 overflow-x-auto px-4 py-3 text-sm font-black text-neutral-700 sm:px-5">
          <a href="#top-stories" className="shrink-0 hover:text-red-700">
            Top Stories
          </a>
          <a href="#rankings" className="shrink-0 hover:text-red-700">
            Rankings
          </a>
          <a href="#waiver-wire" className="shrink-0 hover:text-red-700">
            Waiver Wire
          </a>
          <a href="#draft-strategy" className="shrink-0 hover:text-red-700">
            Draft Strategy
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
              Sponsor the Fantasy Sports Desk
            </p>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600 sm:mt-0">
            Reach fantasy players throughout the entire year. Advertising
            opportunities available.
          </p>
        </aside>

        <LeagueDesk
          leagueKey="fantasy"
          leagueName="Fantasy Sports"
          report={report}
          config={FANTASY_DESK_CONFIG}
        />

        <section
          id="waiver-wire"
          aria-labelledby="waiver-wire-heading"
          className="scroll-mt-16"
        >
          <p className="gsr-section-label">Editorial coverage</p>
          <h2 id="waiver-wire-heading" className="mt-2 text-2xl font-black">
            Waiver Wire
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-neutral-700">
            These coverage areas organize waiver analysis without inventing
            player recommendations, projections, injuries, or bid amounts.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {WAIVER_WIRE_LANES.map((lane) => (
              <article key={lane.title} className="gsr-card p-5">
                <h3 className="text-lg font-black">{lane.title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-700">
                  {lane.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          id="draft-strategy"
          aria-labelledby="draft-strategy-heading"
          className="scroll-mt-16"
        >
          <p className="gsr-section-label">Planning and formats</p>
          <h2 id="draft-strategy-heading" className="mt-2 text-2xl font-black">
            Draft Strategy
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {DRAFT_STRATEGY_LANES.map((lane) => (
              <article key={lane.title} className="gsr-card p-5">
                <h3 className="text-lg font-black">{lane.title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-700">
                  {lane.description}
                </p>
              </article>
            ))}
          </div>
        </section>

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
            GSR goes beyond rankings by connecting fantasy strategy with player
            usage, analytics, roster construction, injuries, scheduling, league
            trends, and the growing fantasy sports industry.
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
            Global Sports Report values accuracy, transparency, and responsible
            guidance in every format.
          </p>
          <ul className="mt-5 grid gap-3 text-sm leading-6 text-neutral-300 md:grid-cols-2">
            <li>We rely on trusted sourcing and verify information before publication.</li>
            <li>Reporting, analysis, opinion, and strategy are identified and kept distinct.</li>
            <li>Material errors are corrected clearly when they are discovered.</li>
            <li>
              Rankings, projections, injuries, and player recommendations are
              never fabricated or presented without a transparent basis.
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
