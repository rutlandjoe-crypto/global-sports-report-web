import type { Metadata } from "next";
import Link from "next/link";
import LeagueDesk, {
  type LeagueDeskConfig,
} from "@/components/sports-desk/LeagueDesk";
import SportsNetworkGrowth from "@/components/sports-desk/SportsNetworkGrowth";
import { readSportsReport } from "@/app/apps/report";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "WNBA Desk | Global Sports Report",
  description:
    "WNBA news, scores, standings, analysis, and context from Global Sports Report.",
  alternates: {
    canonical: "https://www.globalsportsreport.com/apps/wnba",
  },
};

const WNBA_DESK_CONFIG = {
  slug: "wnba",
  sport: "wnba",
  headlinesTitle: "Latest WNBA Headlines",
  scoreboardTitle: "WNBA Scoreboard",
  scoreboardEmpty:
    "Verified WNBA games are not available in the current report. Current games, live scores, and results will appear here when supported data is available.",
  standingsTitle: "WNBA Standings",
  standingsAnchor: "standings",
  standingsEmpty:
    "Verified WNBA standings are not available in the current report. League records and playoff positioning will appear here when the data feed supports them.",
  fallbackHeadline: "The storylines shaping the WNBA",
  fallbackSummary:
    "A continuing editorial look at the championship race, player development, roster construction, coaching, expansion, audience growth, and the business of the league when verified developments are available.",
  fallbackHeadlines: [
    {
      label: "Playoff positioning",
      headline: "Following the playoff picture",
      summary:
        "A coverage lane for verified results, seeding implications, tiebreaker context, and the championship race.",
    },
    {
      label: "Roster construction",
      headline: "The roster-building decisions behind each team",
      summary:
        "Analysis of depth, role balance, player fit, and how teams construct a sustainable rotation.",
    },
    {
      label: "Player development",
      headline: "Player development across a demanding season",
      summary:
        "A continuing focus on evolving roles, skill growth, opportunity, and the path from prospect to established contributor.",
    },
    {
      label: "Coaching decisions",
      headline: "Coaching, systems, and team identity",
      summary:
        "Coverage of rotations, tactical choices, player usage, and the decisions that establish a team’s identity.",
    },
    {
      label: "League growth",
      headline: "Expansion, attendance, and audience growth",
      summary:
        "Context on the league’s reach, new markets, fan engagement, investment, and long-term development.",
    },
    {
      label: "Media rights",
      headline: "Media coverage and the league’s growing audience",
      summary:
        "Coverage of distribution, visibility, audience behavior, and the media economics surrounding the WNBA.",
    },
    {
      label: "League business",
      headline: "Sponsorship and the business of women’s basketball",
      summary:
        "Editorial context on commercial growth, labor, investment, partnerships, and the league’s wider impact.",
    },
  ],
} satisfies LeagueDeskConfig;

const PLAYOFF_RACE_LANES = [
  {
    title: "Championship Contenders",
    description:
      "Verified performance, roster depth, and the strengths that shape the championship conversation.",
  },
  {
    title: "Playoff Positioning",
    description:
      "League records, seeding context, and the implications of verified results when supported data is available.",
  },
  {
    title: "Teams on the Bubble",
    description:
      "A coverage lane for the competitive pressure surrounding the final playoff positions.",
  },
  {
    title: "Seeding Implications",
    description:
      "How verified games affect matchups and positioning without unsupported projections.",
  },
  {
    title: "Remaining Schedule",
    description:
      "Opponent quality, travel, rest, and schedule structure when verified fixtures are available.",
  },
  {
    title: "Tiebreaker Context",
    description:
      "The supported rules and head-to-head context relevant to the playoff race.",
  },
  {
    title: "Home-Court Position",
    description:
      "The competitive value of seeding and verified movement near the top of the standings.",
  },
  {
    title: "Late-Season Momentum",
    description:
      "A lane for verified trends, player availability, and team form as the postseason approaches.",
  },
] as const;

const STORYLINES = [
  {
    title: "Championship Race",
    description:
      "Verified results, roster strengths, and the competitive context surrounding the title chase.",
  },
  {
    title: "Player Availability",
    description:
      "Responsibly sourced injury reporting, workload, return timelines, and the effect on team depth.",
  },
  {
    title: "Roster Construction",
    description:
      "Depth, role balance, player fit, and the decisions behind a competitive rotation.",
  },
  {
    title: "Rookie Development",
    description:
      "Opportunity, role growth, adjustment, and the path into sustained professional impact.",
  },
  {
    title: "Coaching and Team Identity",
    description:
      "Systems, rotations, player usage, and the strategic choices that define a team.",
  },
  {
    title: "Offensive and Defensive Trends",
    description:
      "Pace, spacing, shot profile, coverage, lineup construction, and tactical adjustments.",
  },
  {
    title: "Expansion",
    description:
      "New markets, roster implications, infrastructure, and the league’s long-term competitive growth.",
  },
  {
    title: "Attendance and Audience Growth",
    description:
      "Fan engagement, reach, visibility, and the forces expanding the league’s audience.",
  },
  {
    title: "Media Rights and Coverage",
    description:
      "Distribution, broadcast access, storytelling, and the economics of league visibility.",
  },
  {
    title: "Sponsorship and League Business",
    description:
      "Partnerships, investment, labor, commercial strategy, and sustainable league growth.",
  },
  {
    title: "Player Leadership",
    description:
      "Veteran influence, team culture, advocacy, and leadership on and away from the court.",
  },
  {
    title: "The Growth of Women’s Basketball",
    description:
      "Development pathways, participation, media attention, investment, and the sport’s broader momentum.",
  },
] as const;

export default function WnbaDeskPage() {
  const report = readSportsReport();

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
            WNBA Desk
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-700">
            WNBA news, scores, standings, analysis, and context from Global
            Sports Report.
          </p>
        </div>
      </header>

      <nav
        aria-label="WNBA Desk sections"
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
          <a href="#playoff-race" className="shrink-0 hover:text-red-700">
            Playoff Race
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
              Sponsor the WNBA Desk
            </p>
          </div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-neutral-600 sm:mt-0">
            Reach readers following the league’s teams, players, championship
            race, growth, and business. Advertising opportunities available.
          </p>
        </aside>

        <LeagueDesk
          leagueKey="wnba"
          leagueName="WNBA"
          report={report}
          config={WNBA_DESK_CONFIG}
        />

        <section
          id="playoff-race"
          aria-labelledby="playoff-race-heading"
          className="scroll-mt-16"
        >
          <p className="gsr-section-label">Competitive picture</p>
          <h2 id="playoff-race-heading" className="mt-2 text-2xl font-black">
            Playoff Race
          </h2>
          <p className="mt-3 max-w-3xl leading-7 text-neutral-700">
            These coverage lanes organize GSR’s playoff reporting without
            estimating seeds, clinching scenarios, standings movement, or odds.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {PLAYOFF_RACE_LANES.map((lane) => (
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
            GSR goes beyond the final score. The WNBA Desk connects games and
            standings to the championship race, player development, roster
            construction, coaching decisions, expansion, audience growth,
            media coverage, sponsorship, and the business of women’s basketball.
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
              Injuries and player availability are reported responsibly;
              unsupported trade, roster, suspension, injury, or locker-room
              rumors and anonymous social speculation are not treated as
              confirmed reporting.
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
