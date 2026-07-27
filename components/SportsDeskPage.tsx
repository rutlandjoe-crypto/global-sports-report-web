import Link from "next/link";
import EditorialStandard from "@/components/EditorialStandard";
import { getSportsDesk, type DeskStory, type SportsDesk } from "@/lib/sportsDesks";

const PRIMARY_MODULES = new Set(["top-stories", "latest-news"]);
const RAW_DATA_MODULES = new Set(["scores", "schedule", "standings", "rankings"]);

type DataSection = {
  id: string;
  label: string;
  kind: "games" | "standings" | "rankings";
  sources: Array<keyof SportsDesk["data"]>;
  providerKey: string;
};

type StorylineSpec = { id: string; label: string; moduleIds: string[]; required?: boolean };

const DATA_SECTIONS: Record<string, DataSection[]> = {
  nfl: [
    { id: "scoreboard", label: "Scoreboard & Upcoming Schedule", kind: "games", sources: ["scores", "schedule"], providerKey: "scores" },
    { id: "standings", label: "Standings", kind: "standings", sources: ["standings"], providerKey: "standings" },
  ],
  "college-football": [
    { id: "schedule", label: "Upcoming Schedule", kind: "games", sources: ["schedule"], providerKey: "scores" },
    { id: "rankings", label: "Rankings", kind: "rankings", sources: ["rankings"], providerKey: "rankings" },
  ],
  mlb: [
    { id: "scoreboard", label: "Current & Recent Scoreboard", kind: "games", sources: ["scores", "schedule"], providerKey: "scores" },
    { id: "standings", label: "Standings", kind: "standings", sources: ["standings"], providerKey: "standings" },
  ],
  soccer: [
    { id: "matches", label: "Matches", kind: "games", sources: ["scores", "schedule"], providerKey: "scores" },
    { id: "tables", label: "Tables", kind: "standings", sources: ["standings"], providerKey: "standings" },
  ],
  wnba: [
    { id: "scoreboard", label: "Scoreboard & Upcoming Games", kind: "games", sources: ["scores", "schedule"], providerKey: "scores" },
    { id: "standings", label: "Standings", kind: "standings", sources: ["standings"], providerKey: "standings" },
  ],
  fantasy: [],
};

const CONTEXT_SECTIONS: Record<string, StorylineSpec[]> = {
  mlb: [{ id: "pennant-race", label: "Pennant & Postseason Race", moduleIds: ["division-races", "wild-card-picture"], required: true }],
  soccer: [{ id: "competitions", label: "Competitions", moduleIds: ["champions-league", "premier-league", "mls", "world-cup"], required: true }],
  wnba: [
    { id: "playoff-race", label: "Playoff Race", moduleIds: ["championship-race"], required: true },
    { id: "team-player-storylines", label: "Team & Player Storylines", moduleIds: ["player-development", "trades", "roster-moves", "injuries"], required: true },
  ],
};

const REQUIRED_STORYLINE_DESKS = new Set(["nfl", "college-football"]);

function readableDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

function validExternalUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validStories(items: Array<Record<string, unknown>>): DeskStory[] {
  return (items as unknown as DeskStory[]).filter((story) => story.title && validExternalUrl(story.url));
}

function StoryCard({ story, compact = false }: { story: DeskStory; compact?: boolean }) {
  return (
    <article className={`${compact ? "" : "rounded-xl border border-[#dbe4f0] bg-white p-5 shadow-sm"} group relative focus-within:ring-2 focus-within:ring-[#315c8d] focus-within:ring-offset-2`}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#315c8d]">{story.publisher}</p>
      <h3 className={`${compact ? "mt-1 text-sm leading-6" : "mt-2 text-lg leading-7"} font-bold text-[#0f1c2e] group-hover:text-[#315c8d] group-hover:underline`}>
        <a
          href={story.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Read ${story.title} from ${story.publisher} (opens in a new tab)`}
          className="after:absolute after:inset-0 focus:outline-none"
        >
          {story.title}
        </a>
      </h3>
      {!compact && story.summary ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{story.summary}</p> : null}
      {!compact && readableDate(story.published_at) ? <p className="mt-3 text-xs text-slate-500">{readableDate(story.published_at)}</p> : null}
      {!compact ? (
        <a
          href={story.url}
          target="_blank"
          rel="noopener noreferrer"
          className="relative z-10 mt-4 inline-flex text-sm font-bold text-[#315c8d] underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315c8d]"
        >
          Read original source <span aria-hidden="true">↗</span>
        </a>
      ) : null}
    </article>
  );
}

function GameRow({ item }: { item: Record<string, unknown> }) {
  const away = String(item.away ?? "");
  const home = String(item.home ?? "");
  const status = String(item.status ?? "");
  const awayScore = String(item.away_score ?? "");
  const homeScore = String(item.home_score ?? "");
  const competition = String(item.competition ?? "");
  const url = validExternalUrl(item.url) ? item.url : validExternalUrl(item.source_url) ? item.source_url : "";
  const body = (
    <>
      {competition ? <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-[#315c8d]">{competition}</p> : null}
      <p className="font-bold text-[#0f1c2e]">
        {away} {awayScore ? <span className="tabular-nums">{awayScore}</span> : null}
        <span className="mx-2 text-slate-400">at</span>
        {home} {homeScore ? <span className="tabular-nums">{homeScore}</span> : null}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{status}</p>
    </>
  );
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${away} at ${home}: ${status} (opens in a new tab)`} className="block rounded-lg bg-[#f8fbff] p-3 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315c8d]">{body}</a>
  ) : <div className="rounded-lg bg-[#f8fbff] p-3">{body}</div>;
}

function StandingRow({ item }: { item: Record<string, unknown> }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-[#dbe4f0] py-2 text-sm last:border-0">
      <span className="font-semibold text-[#0f1c2e]">{String(item.team ?? "")}</span>
      <span className="tabular-nums text-slate-600">{String(item.record ?? "")}</span>
      <span className="min-w-8 text-right tabular-nums text-slate-500">{String(item.games_back ?? "")}</span>
    </div>
  );
}

function RankingRow({ item }: { item: Record<string, unknown> }) {
  return (
    <div className="grid grid-cols-[2.5rem_1fr_auto] gap-3 border-b border-[#dbe4f0] py-2 text-sm last:border-0">
      <span className="font-black tabular-nums text-[#315c8d]">{String(item.rank ?? "")}</span>
      <span className="font-semibold text-[#0f1c2e]">{String(item.team ?? "")}</span>
      <span className="tabular-nums text-slate-600">{String(item.record ?? "")}</span>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="rounded-lg border border-dashed border-[#8fb3d9] bg-[#f8fbff] p-4 text-sm leading-6 text-slate-600">Current verified {label.toLowerCase()} data is unavailable. This section will refresh after the next successful provider update.</p>;
}

export default function SportsDeskPage({ deskId }: { deskId: string }) {
  const { desk, generatedAt } = getSportsDesk(deskId);
  if (!desk || !desk.modules["top-stories"]) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] px-5 py-16 text-slate-950">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#dbe4f0] bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#315c8d]">Global Sports Report</p>
          <h1 className="mt-3 text-3xl font-black">Desk temporarily unavailable</h1>
          <p className="mt-4 leading-7 text-slate-600">Reliable current coverage did not meet this desk&apos;s publication threshold. The module will return after the next successful source refresh.</p>
          <Link href="/" className="mt-6 inline-flex font-bold text-[#315c8d] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315c8d]">Return to Global Sports Report</Link>
        </div>
      </main>
    );
  }

  const topStories = validStories(desk.modules["top-stories"].items);
  if (!topStories.length) return null;
  const latestStories = validStories(desk.modules["latest-news"]?.items ?? []);
  const hero = topStories[0];
  const secondaryTopStories = topStories.slice(1);
  const dataSections = DATA_SECTIONS[deskId] ?? [];
  const contextSpecs = CONTEXT_SECTIONS[deskId] ?? [];
  const consumedModuleIds = new Set(contextSpecs.flatMap((section) => section.moduleIds));
  const contextSections = contextSpecs.map((section) => ({
    ...section,
    stories: validStories(section.moduleIds.flatMap((id) => desk.modules[id]?.items ?? [])),
  }));
  const laneSections = Object.entries(desk.modules)
    .filter(([key]) => !PRIMARY_MODULES.has(key) && !RAW_DATA_MODULES.has(key) && !consumedModuleIds.has(key))
    .map(([id, module]) => ({ id, label: id === "draft-prep" ? "Draft Strategy" : module.label, stories: validStories(module.items) }))
    .filter((section) => section.stories.length);
  const hasStorylines = contextSections.length > 0 || laneSections.length > 0 || REQUIRED_STORYLINE_DESKS.has(deskId);
  const navItems = [
    { id: "top-stories", label: "Top Stories" },
    ...(latestStories.length ? [{ id: "latest-news", label: "Latest News" }] : []),
    ...dataSections.map(({ id, label }) => ({ id, label })),
    ...(hasStorylines ? [{ id: "key-storylines", label: "Key Storylines" }] : []),
    ...contextSections.map(({ id, label }) => ({ id, label })),
    ...laneSections.map(({ id, label }) => ({ id, label })),
    { id: "editorial-standards", label: "Editorial Standards" },
  ];

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <header className="border-b border-white/10 bg-gradient-to-r from-[#0f1c2e] to-[#16304d] text-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8fb3d9]">Global Sports Report</p>
            <Link href="/" className="text-sm font-bold text-blue-100 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">All Sports</Link>
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">GSR {desk.label} Desk</h1>
          <p className="mt-4 max-w-4xl text-sm font-medium tracking-wide text-slate-300 sm:text-base">{desk.competitions.join(" • ")}</p>
          {readableDate(generatedAt) ? <p className="mt-3 text-xs text-slate-400">Content and data refreshed {readableDate(generatedAt)}</p> : null}
        </div>
      </header>

      <nav aria-label={`${desk.label} desk sections`} className="sticky top-0 z-30 border-b border-white/10 bg-[#0f1c2e] text-white shadow-md">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-5 py-3 sm:px-8 lg:px-10">
          {navItems.map((item) => (
            <a key={item.id} href={`#${item.id}`} className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold hover:bg-white/10 hover:text-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">{item.label}</a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <section id="top-stories" className="scroll-mt-24">
          <a href={hero.url} target="_blank" rel="noopener noreferrer" aria-label={`Read ${hero.title} from ${hero.publisher} (opens in a new tab)`} className="group block overflow-hidden rounded-2xl border border-[#dbe4f0] bg-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315c8d] focus-visible:ring-offset-2">
            <div className="border-l-4 border-[#315c8d] px-6 py-8 sm:px-9 sm:py-10 lg:px-12 lg:py-14">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#315c8d]">Top Story · {hero.publisher}</p>
              <h2 className="mt-4 max-w-5xl text-3xl font-black leading-tight tracking-tight text-[#0f1c2e] group-hover:text-[#315c8d] group-hover:underline sm:text-4xl lg:text-5xl">{hero.title}</h2>
              {hero.summary ? <p className="mt-5 max-w-4xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">{hero.summary}</p> : null}
              <span className="mt-5 inline-flex text-sm font-bold text-[#315c8d] underline underline-offset-4">Read original source <span aria-hidden="true">↗</span></span>
            </div>
          </a>

          {secondaryTopStories.length ? (
            <div className="mt-8">
              <h2 className="mb-4 text-2xl font-black tracking-tight text-[#0f1c2e]">Top Stories</h2>
              <div className="grid gap-5 sm:grid-cols-2">{secondaryTopStories.map((story) => <StoryCard key={story.id} story={story} />)}</div>
            </div>
          ) : null}
        </section>

        {latestStories.length ? (
          <aside id="latest-news" className="mt-8 scroll-mt-24 rounded-2xl bg-[#0f1c2e] p-6 text-white shadow-sm sm:p-7">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[#8fb3d9]">Latest News</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {latestStories.map((story) => <div key={story.id} className="border-t border-white/15 pt-4 first:border-t-0 [&_a]:!text-white [&_p]:!text-blue-200"><StoryCard story={story} compact /></div>)}
            </div>
          </aside>
        ) : null}

        {dataSections.length ? (
          <div className="mt-8 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
            {dataSections.map((section) => {
              const items = section.sources.flatMap((source) => desk.data[source] ?? []);
              const sourceUrl = items.find((item) => validExternalUrl(item.source_url))?.source_url;
              const dataUpdated = readableDate(desk.data_updated_at?.[section.providerKey]);
              return (
                <section id={section.id} key={section.id} className="scroll-mt-24 rounded-2xl border border-[#dbe4f0] bg-white p-6 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#315c8d]">Data Desk</p>
                  <h2 className="mt-2 text-xl font-bold text-[#0f1c2e]">{section.label}</h2>
                  {dataUpdated ? <p className="mt-1 text-xs text-slate-500">Verified data updated {dataUpdated}</p> : null}
                  <div className="mt-4 max-h-96 space-y-2 overflow-auto">
                    {!items.length ? <EmptyState label={section.label} /> : section.kind === "standings"
                      ? items.map((item, index) => <StandingRow key={`${String(item.team)}-${index}`} item={item} />)
                      : section.kind === "rankings"
                        ? items.map((item, index) => <RankingRow key={`${String(item.team)}-${index}`} item={item} />)
                        : items.map((item, index) => <GameRow key={`${String(item.id)}-${index}`} item={item} />)}
                  </div>
                  {validExternalUrl(sourceUrl) ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex text-xs font-bold text-[#315c8d] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315c8d]">View verified provider <span aria-hidden="true">↗</span></a> : null}
                </section>
              );
            })}
          </div>
        ) : null}

        {hasStorylines ? (
          <section id="key-storylines" className="mt-8 scroll-mt-24">
            <h2 className="text-2xl font-black tracking-tight text-[#0f1c2e]">Key Storylines</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {contextSections.map((section) => (
                <section id={section.id} key={section.id} className="scroll-mt-24 rounded-2xl border border-[#dbe4f0] bg-white p-6 shadow-sm sm:p-7">
                  <div className="mb-5 h-1 w-12 rounded-full bg-[#315c8d]" />
                  <h3 className="text-xl font-bold tracking-tight text-[#0f1c2e]">{section.label}</h3>
                  <div className="mt-5 space-y-4">
                    {section.stories.length ? section.stories.map((story) => <div key={story.id} className="border-t border-[#dbe4f0] pt-4 first:border-t-0 first:pt-0"><StoryCard story={story} compact /></div>) : <EmptyState label={section.label} />}
                  </div>
                </section>
              ))}
              {laneSections.map((section) => (
                <section id={section.id} key={section.id} className="scroll-mt-24 rounded-2xl border border-[#dbe4f0] bg-white p-6 shadow-sm sm:p-7">
                  <div className="mb-5 h-1 w-12 rounded-full bg-[#315c8d]" />
                  <h3 className="text-xl font-bold tracking-tight text-[#0f1c2e]">{section.label}</h3>
                  <div className="mt-5 space-y-4">{section.stories.map((story) => <div key={story.id} className="border-t border-[#dbe4f0] pt-4 first:border-t-0 first:pt-0"><StoryCard story={story} compact /></div>)}</div>
                </section>
              ))}
              {!contextSections.length && !laneSections.length ? <EmptyState label="key storylines" /> : null}
            </div>
          </section>
        ) : null}

        <section id="editorial-standards" className="scroll-mt-24"><EditorialStandard /></section>
        <section className="mt-8 rounded-2xl border border-dashed border-[#8fb3d9] bg-[#f8fbff] p-6 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#315c8d]">Sponsor</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">Sponsorship placement reserved.</p>
        </section>
      </div>
    </main>
  );
}