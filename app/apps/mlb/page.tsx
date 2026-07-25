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
  title: "MLB Desk | Global Sports Report",
  description:
    "Major League Baseball news, scores, standings, analysis, and context from Global Sports Report.",
  alternates: {
    canonical: "https://www.globalsportsreport.com/apps/mlb",
  },
};

const MLB_DESK_CONFIG = {
  slug: "mlb",
  sport: "baseball",
  headlinesTitle: "Latest MLB Headlines",
  scoreboardTitle: "MLB Scoreboard",
  scoreboardEmpty:
    "Verified MLB games are not available in the current report. Current games and results will appear here when supported data is available.",
  standingsTitle: "MLB Standings",
  standingsAnchor: "standings",
  standingsEmpty:
    "Verified MLB standings are not available in the current report. Division records and games-back context will appear here when the data feed supports them.",
  fallbackHeadline: "The questions shaping baseball’s season",
  fallbackSummary:
    "A continuing editorial look at division races, the Wild Card picture, pitching depth, roster construction, and postseason implications when verified developments are available.",
  fallbackHeadlines: [
    {
      label: "Division races",
      headline: "How division races take shape",
      summary:
        "A coverage lane for roster balance, run prevention, schedule pressure, and the variables that define each division.",
    },
    {
      label: "Wild Card races",
      headline: "Following the Wild Card picture",
      summary:
        "Context for understanding the postseason chase as verified results and standings become available.",
    },
    {
      label: "Pitching trends",
      headline: "Pitching depth across a long season",
      summary:
        "A continuing focus on rotation stability, bullpen workload, development, and staff construction.",
    },
    {
      label: "Roster construction",
      headline: "The roster-building choices behind the headlines",
      summary:
        "Analysis of depth, positional value, contracts, and how clubs prepare for the demands of a full season.",
    },
    {
      label: "Prospect development",
      headline: "Player development from the system to the majors",
      summary:
        "Coverage of development paths, organizational depth, and the decisions that connect prospects to major-league needs.",
    },
    {
      label: "Front-office strategy",
      headline: "Front-office decisions and competitive windows",
      summary:
        "Context on transactions, resource allocation, and the strategy behind sustainable contention.",
    },
    {
      label: "League business",
      headline: "The business forces shaping baseball",
      summary:
        "Coverage of media, labor, governance, audience trends, and the economics surrounding the game.",
    },
  ],
} satisfies LeagueDeskConfig;

const PENNANT_RACE_LANES = [
  {
    title: "Division Leaders",
    description:
      "Verified records, schedule context, and the strengths influencing each division race.",
  },
  {
    title: "Wild Card Picture",
    description:
      "The broader postseason field, tiebreaker context, and positioning when supported data is available.",
  },
  {
    title: "Teams Gaining Ground",
    description:
      "A lane for verified trends, roster changes, and results that alter the competitive picture.",
  },
  {
    title: "Teams Under Pressure",
    description:
      "Schedule demands, roster depth, and the decisions facing clubs in a postseason chase.",
  },
  {
    title: "Postseason Implications",
    description:
      "The stakes connected to verified daily results and movement in the standings.",
  },
  {
    title: "Remaining Schedule Context",
    description:
      "Travel, opponent quality, rest, and the structure of the schedule without unsupported projections.",
  },
] as const;

const STORYLINES = [
  {
    title: "Division Races",
    description:
      "Verified results, roster strengths, and schedule pressure across each division.",
  },
  {
    title: "Wild Card Picture",
    description:
      "Postseason positioning, tiebreaker context, and the implications of verified games.",
  },
  {
    title: "Starting Pitching",
    description:
      "Rotation stability, workload, availability, and how clubs build innings across a season.",
  },
  {
    title: "Bullpen Performance",
    description:
      "Relief depth, role clarity, workload patterns, and late-game decision-making.",
  },
  {
    title: "Injuries and Roster Depth",
    description:
      "Verified availability news, depth consequences, and the corresponding roster response.",
  },
  {
    title: "Trade and Transaction Strategy",
    description:
      "Sourced movement, roster needs, competitive windows, and front-office priorities.",
  },
  {
    title: "Prospects and Player Development",
    description:
      "Development paths, organizational depth, and the transition from the minors to the majors.",
  },
  {
    title: "Front-Office Decisions",
    description:
      "Resource allocation, roster construction, and the strategy behind sustained contention.",
  },
  {
    title: "League Business and Media",
    description:
      "Media rights, labor, governance, audience trends, and the economics around baseball.",
  },
  {
    title: "Postseason Implications",
    description:
      "The October stakes attached to verified results, standings, and roster decisions.",
  },
] as const;

export default function MlbDeskPage() {
  const report = readSportsReport();
  const updated = freshestLeagueUpdate(report, "mlb");

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
            MLB Desk
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-700">
            Major League Baseball news, scores, standings, analysis, and context
            from Global Sports Report.
          </p>
          {updated ? (
            <p className="mt-4 text-sm font-bold text-neutral-500">
              Latest report update: {updated}
            </p>
          ) : null}
        </div>
      </header>

      <nav
        aria-label="MLB Desk sections"
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
          <a href="#pennant-race" className="shrink-0 hover:text-red-700">
            Pennant Race
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
              Sponsor the MLB Desk
            </p>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600 sm:mt-0">
            Reach readers following baseball’s daily schedule, division races,
            postseason chase, and the business of the game. Advertising
            opportunities available.
          </p>
        </aside>

        <LeagueDesk
          leagueKey="mlb"
          leagueName="MLB"
          report={report}
          config={MLB_DESK_CONFIG}
        />

        <section
          id="pennant-race"
          aria-labelledby="pennant-race-heading"
          className="scroll-mt-16"
        >
          <p className="gsr-section-label">Competitive picture</p>
          <h2 id="pennant-race-heading" className="mt-2 text-2xl font-black">
            Pennant Race
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-neutral-700">
            These coverage lanes organize GSR’s pennant-race reporting without
            estimating records, standings movement, or playoff odds.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {PENNANT_RACE_LANES.map((lane) => (
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
            GSR goes beyond the box score. The MLB Desk connects daily results
            to division races, the Wild Card picture, roster construction,
            pitching depth, player development, front-office strategy,
            postseason implications, media, and the business of baseball.
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
              Unsupported trade, injury, clubhouse, or transaction rumors are
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
