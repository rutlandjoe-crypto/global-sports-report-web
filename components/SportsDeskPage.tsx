import Link from "next/link";
import EditorialStandard from "@/components/EditorialStandard";
import { getSportsDesk, type DeskStory } from "@/lib/sportsDesks";

const DATA_MODULES = new Set(["scores", "schedule", "standings"]);
const PRIMARY_MODULES = new Set(["top-stories", "latest-news"]);

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

function StoryLink({ story, compact = false }: { story: DeskStory; compact?: boolean }) {
  return (
    <article className={compact ? "" : "rounded-xl border border-[#dbe4f0] bg-white p-5 shadow-sm"}>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#315c8d]">{story.publisher}</p>
      <a
        href={story.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${compact ? "mt-1 text-sm leading-6" : "mt-2 text-lg leading-7"} block font-bold text-[#0f1c2e] hover:text-[#315c8d] hover:underline`}
      >
        {story.title}
      </a>
      {!compact && story.summary ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{story.summary}</p> : null}
      {!compact && readableDate(story.published_at) ? <p className="mt-3 text-xs text-slate-500">{readableDate(story.published_at)}</p> : null}
    </article>
  );
}

function GameRow({ item }: { item: Record<string, unknown> }) {
  const away = String(item.away ?? "");
  const home = String(item.home ?? "");
  const status = String(item.status ?? "");
  const awayScore = String(item.away_score ?? "");
  const homeScore = String(item.home_score ?? "");
  const url = String(item.url ?? "");
  const body = (
    <>
      <p className="font-bold text-[#0f1c2e]">
        {away} {awayScore ? <span className="tabular-nums">{awayScore}</span> : null}
        <span className="mx-2 text-slate-400">at</span>
        {home} {homeScore ? <span className="tabular-nums">{homeScore}</span> : null}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{status}</p>
    </>
  );
  return url ? (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block rounded-lg bg-[#f8fbff] p-3 hover:bg-blue-50">{body}</a>
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

export default function SportsDeskPage({ deskId }: { deskId: string }) {
  const { desk, generatedAt } = getSportsDesk(deskId);
  if (!desk || !desk.modules["top-stories"]) {
    return (
      <main className="min-h-screen bg-[#f5f7fb] px-5 py-16 text-slate-950">
        <div className="mx-auto max-w-3xl rounded-2xl border border-[#dbe4f0] bg-white p-8 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#315c8d]">Global Sports Report</p>
          <h1 className="mt-3 text-3xl font-black">Desk temporarily unavailable</h1>
          <p className="mt-4 leading-7 text-slate-600">Reliable current coverage did not meet this desk&apos;s publication threshold. The module will return after the next successful source refresh.</p>
          <Link href="/" className="mt-6 inline-flex font-bold text-[#315c8d] hover:underline">Return to Global Sports Report</Link>
        </div>
      </main>
    );
  }

  const topStories = desk.modules["top-stories"].items as unknown as DeskStory[];
  const latestStories = (desk.modules["latest-news"]?.items ?? []) as unknown as DeskStory[];
  const secondaryTopStories = topStories.slice(1);
  const hero = topStories[0];
  const laneModules = Object.entries(desk.modules).filter(([key]) => !PRIMARY_MODULES.has(key) && !DATA_MODULES.has(key));
  const dataModules = Object.entries(desk.modules).filter(([key]) => DATA_MODULES.has(key));

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <header className="border-b border-white/10 bg-gradient-to-r from-[#0f1c2e] to-[#16304d] text-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16 lg:px-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#8fb3d9]">Global Sports Report</p>
            <Link href="/" className="text-sm font-bold text-blue-100 hover:text-white hover:underline">All Sports</Link>
          </div>
          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">GSR {desk.label} Desk</h1>
          <p className="mt-4 max-w-4xl text-sm font-medium tracking-wide text-slate-300 sm:text-base">{desk.competitions.join(" • ")}</p>
          {readableDate(generatedAt) ? <p className="mt-3 text-xs text-slate-400">Content and data refreshed {readableDate(generatedAt)}</p> : null}
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-10 lg:py-12">
        <section className="overflow-hidden rounded-2xl border border-[#dbe4f0] bg-white shadow-sm">
          <div className="border-l-4 border-[#315c8d] px-6 py-8 sm:px-9 sm:py-10 lg:px-12 lg:py-14">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#315c8d]">Top Story · {hero.publisher}</p>
            <a href={hero.url} target="_blank" rel="noopener noreferrer" className="group">
              <h2 className="mt-4 max-w-5xl text-3xl font-black leading-tight tracking-tight text-[#0f1c2e] group-hover:text-[#315c8d] group-hover:underline sm:text-4xl lg:text-5xl">{hero.title}</h2>
            </a>
            {hero.summary ? <p className="mt-5 max-w-4xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">{hero.summary}</p> : null}
          </div>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
          {secondaryTopStories.length ? (
            <section>
              <h2 className="mb-4 text-2xl font-black tracking-tight text-[#0f1c2e]">Top Stories</h2>
              <div className="grid gap-5 sm:grid-cols-2">{secondaryTopStories.map((story) => <StoryLink key={story.id} story={story} />)}</div>
            </section>
          ) : null}
          {latestStories.length ? (
            <aside className="rounded-2xl bg-[#0f1c2e] p-6 text-white shadow-sm sm:p-7">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8fb3d9]">Latest News</p>
              <div className="mt-5 space-y-4">
                {latestStories.map((story) => (
                  <div key={story.id} className="border-t border-white/15 pt-4 first:border-t-0 first:pt-0 [&_a]:!text-white [&_p]:!text-blue-200"><StoryLink story={story} compact /></div>
                ))}
              </div>
            </aside>
          ) : null}
        </div>

        {dataModules.length ? (
          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {dataModules.map(([key, module]) => (
              <section key={key} className="rounded-2xl border border-[#dbe4f0] bg-white p-6 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#315c8d]">Data Desk</p>
                <h2 className="mt-2 text-xl font-bold text-[#0f1c2e]">{module.label}</h2>
                <div className="mt-4 max-h-96 space-y-2 overflow-auto">
                  {key === "standings"
                    ? module.items.map((item, index) => <StandingRow key={`${String(item.team)}-${index}`} item={item} />)
                    : module.items.map((item, index) => <GameRow key={`${String(item.id)}-${index}`} item={item} />)}
                </div>
              </section>
            ))}
          </div>
        ) : null}

        {laneModules.length ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {laneModules.map(([key, module]) => (
              <section key={key} className="rounded-2xl border border-[#dbe4f0] bg-white p-6 shadow-sm sm:p-7">
                <div className="mb-5 h-1 w-12 rounded-full bg-[#315c8d]" />
                <h2 className="text-xl font-bold tracking-tight text-[#0f1c2e]">{module.label}</h2>
                <div className="mt-5 space-y-4">
                  {(module.items as unknown as DeskStory[]).map((story) => (
                    <div key={story.id} className="border-t border-[#dbe4f0] pt-4 first:border-t-0 first:pt-0"><StoryLink story={story} compact /></div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : null}

        <EditorialStandard />
        <section className="mt-8 rounded-2xl border border-dashed border-[#8fb3d9] bg-[#f8fbff] p-6 sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#315c8d]">Sponsor</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">Sponsorship placement reserved.</p>
        </section>
      </div>
    </main>
  );
}
