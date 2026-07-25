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
  title: "Soccer Desk | Global Sports Report",
  description:
    "Soccer news, scores, tables, analysis, and context from leagues and competitions around the world.",
  alternates: {
    canonical: "https://www.globalsportsreport.com/apps/soccer",
  },
};

const SOCCER_DESK_CONFIG = {
  slug: "soccer",
  sport: "soccer",
  headlinesTitle: "Latest Soccer Headlines",
  scoreboardTitle: "Match Center",
  scoreboardEmpty:
    "Verified fixtures, live scores, and results are not available in the current report. Match coverage will appear here as supported data becomes available.",
  standingsTitle: "Tables",
  standingsAnchor: "tables",
  standingsEmpty:
    "Verified competition tables are not available in the current report. League and group tables will appear here when the data feed supports them.",
  fallbackHeadline: "The storylines shaping the global game",
  fallbackSummary:
    "A continuing editorial look at title races, qualification battles, transfers, tactics, international competition, and the business of soccer when verified developments are available.",
  fallbackHeadlines: [
    {
      label: "Title races",
      headline: "Following title and qualification races",
      summary:
        "A coverage lane for verified results, schedule pressure, squad depth, and the variables shaping domestic campaigns.",
    },
    {
      label: "Transfer strategy",
      headline: "Transfer strategy through a squad-building lens",
      summary:
        "Careful analysis of sourced reporting, squad balance, wage structure, and long-term sporting plans.",
    },
    {
      label: "Tactical trends",
      headline: "The tactical ideas influencing the game",
      summary:
        "A continuing focus on systems, roles, pressing, possession, and how teams adapt across competitions.",
    },
    {
      label: "International soccer",
      headline: "International competition and national-team development",
      summary:
        "Context around verified tournament developments, qualification, player availability, and national-team direction.",
    },
    {
      label: "Women’s soccer",
      headline: "The growth and competitive direction of women’s soccer",
      summary:
        "Coverage of club competitions, international soccer, player development, media, and investment.",
    },
    {
      label: "Club ownership",
      headline: "Ownership, finance, and sporting ambition",
      summary:
        "Editorial context on governance, investment, supporter interests, and the decisions shaping clubs.",
    },
    {
      label: "Media rights",
      headline: "The media business behind the global game",
      summary:
        "Coverage of distribution, audiences, commercial strategy, and the economics surrounding soccer.",
    },
  ],
} satisfies LeagueDeskConfig;

const COMPETITIONS = [
  {
    title: "Premier League",
    description:
      "Club performance, title and qualification races, squad building, and the business of England’s top flight.",
  },
  {
    title: "UEFA Champions League",
    description:
      "European competition, tactical matchups, qualification stakes, and the path through the tournament.",
  },
  {
    title: "Major League Soccer",
    description:
      "League competition, club development, roster strategy, and soccer’s growth in North America.",
  },
  {
    title: "NWSL",
    description:
      "Club competition, player development, growth, media, and the evolving landscape of the women’s game.",
  },
  {
    title: "European Leagues",
    description:
      "Domestic title races, qualification battles, relegation pressure, and major storylines across Europe.",
  },
  {
    title: "Women’s Club Soccer",
    description:
      "Domestic and continental competition, investment, player movement, and the global club game.",
  },
  {
    title: "International Soccer",
    description:
      "National teams, qualification, tournaments, player availability, and international windows.",
  },
  {
    title: "World Cup and Continental Competitions",
    description:
      "Verified tournament developments, qualification context, squad construction, and global stakes.",
  },
] as const;

const STORYLINES = [
  {
    title: "Title and Qualification Races",
    description:
      "Verified results, schedule pressure, and the competitive context across leagues and tournaments.",
  },
  {
    title: "Transfers and Squad Building",
    description:
      "Responsibly attributed reporting, squad needs, wage structure, and long-term sporting strategy.",
  },
  {
    title: "Tactical Trends",
    description:
      "Systems, roles, pressing, possession, and the adjustments shaping matches across the sport.",
  },
  {
    title: "Managers Under Pressure",
    description:
      "Verified club decisions, performance context, leadership, and the expectations surrounding a team.",
  },
  {
    title: "Player Development",
    description:
      "Academies, pathways, minutes, loans, and the transition into senior club and international soccer.",
  },
  {
    title: "International Soccer",
    description:
      "National-team direction, qualification, tournaments, and verified player-availability context.",
  },
  {
    title: "Women’s Soccer",
    description:
      "Club and international competition, development, investment, audiences, and media coverage.",
  },
  {
    title: "Club Ownership and Finance",
    description:
      "Governance, investment, supporter interests, sustainability, and the economics behind clubs.",
  },
  {
    title: "Media Rights",
    description:
      "Distribution, broadcast strategy, audiences, and how media economics affect the sport.",
  },
  {
    title: "The Business of the Global Game",
    description:
      "Commercial strategy, labor, governance, competition structures, and soccer’s worldwide reach.",
  },
] as const;

export default function SoccerDeskPage() {
  const report = readSportsReport();
  const updated = freshestLeagueUpdate(report, "soccer");

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
            Soccer Desk
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-700">
            Soccer news, scores, tables, analysis, and context from leagues and
            competitions around the world.
          </p>
          {updated ? (
            <p className="mt-4 text-sm font-bold text-neutral-500">
              Latest report update: {updated}
            </p>
          ) : null}
        </div>
      </header>

      <nav
        aria-label="Soccer Desk sections"
        className="sticky top-0 z-10 border-b border-neutral-300 bg-white/95 backdrop-blur"
      >
        <div className="mx-auto flex max-w-7xl gap-x-5 overflow-x-auto px-4 py-3 text-sm font-black text-neutral-700 sm:px-5">
          <a href="#top-stories" className="shrink-0 hover:text-red-700">
            Top Stories
          </a>
          <a href="#scoreboard" className="shrink-0 hover:text-red-700">
            Matches
          </a>
          <a href="#tables" className="shrink-0 hover:text-red-700">
            Tables
          </a>
          <a href="#competitions" className="shrink-0 hover:text-red-700">
            Competitions
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
              Sponsor the Soccer Desk
            </p>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600 sm:mt-0">
            Reach readers following the world’s leagues, clubs, players,
            international competitions, and the business of the global game.
            Advertising opportunities available.
          </p>
        </aside>

        <LeagueDesk
          leagueKey="soccer"
          leagueName="Soccer"
          report={report}
          config={SOCCER_DESK_CONFIG}
        />

        <section
          id="competitions"
          aria-labelledby="competitions-heading"
          className="scroll-mt-16"
        >
          <p className="gsr-section-label">Global coverage</p>
          <h2 id="competitions-heading" className="mt-2 text-2xl font-black">
            Competitions
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-neutral-700">
            The Soccer Desk follows the sport across club and international
            competition. These are coverage lanes, not separate desk routes.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {COMPETITIONS.map((competition) => (
              <article key={competition.title} className="gsr-card p-5">
                <h3 className="text-lg font-black">{competition.title}</h3>
                <p className="mt-2 text-sm leading-6 text-neutral-700">
                  {competition.description}
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
            GSR looks beyond the final whistle. The Soccer Desk connects matches
            and results to title races, qualification battles, transfers,
            tactics, player development, international competition, club
            ownership, media, and the business of the global game.
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
              Transfer reporting is attributed responsibly; unsupported
              transfer, injury, dressing-room, lineup, or managerial rumors are
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
