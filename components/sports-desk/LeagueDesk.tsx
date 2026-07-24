type JsonObject = Record<string, unknown>;

export type LeagueDeskProps = {
  leagueKey: string;
  leagueName: string;
  report: JsonObject;
};

type Story = {
  headline: string;
  url: string;
  source: string;
  snapshot: string;
  why: string[];
  watch: string[];
  storyType: string;
  updated: string;
};

type Game = {
  id: string;
  away: string;
  home: string;
  awayScore: string;
  homeScore: string;
  status: string;
  time: string;
  date: string;
  url: string;
};

type Standing = {
  team: string;
  wins: string;
  losses: string;
  pct: string;
  gamesBack: string;
};

const GENERIC_TITLES = new Set([
  "mlb",
  "mlb report",
  "sports newsroom update",
  "latest mlb news",
  "mlb news",
  "baseball news",
]);

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function text(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value)
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&quot;/gi, '"')
      .replace(/&amp;/gi, "&")
      .replace(/&nbsp;/gi, " ")
      .replace(/&rsquo;|&lsquo;/gi, "'")
      .replace(/&rdquo;|&ldquo;/gi, '"')
      .replace(/&ndash;/gi, "–")
      .replace(/&mdash;/gi, "—")
      .replace(/â€™/g, "'")
      .replace(/â€œ|â€/g, '"')
      .replace(/â€“/g, "–")
      .replace(/â€”/g, "—")
      .replace(/\s+/g, " ")
      .trim();
  }
  return "";
}

function firstText(source: JsonObject, keys: string[]): string {
  for (const key of keys) {
    const value = text(source[key]);
    if (value) return value;
  }
  return "";
}

function list(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.flatMap((item) => {
    if (typeof item === "string" || typeof item === "number") {
      return text(item)
        .split(/\n|•/)
        .map(text)
        .filter(Boolean);
    }
    return [];
  });
}

function validUrl(value: unknown): string {
  const candidate = text(value);
  try {
    const url = new URL(candidate);
    return url.protocol === "http:" || url.protocol === "https:" ? candidate : "";
  } catch {
    return "";
  }
}

function formatEt(value: unknown): string {
  const raw = text(value);
  if (!raw) return "";
  if (/\bE[SD]?T\b/i.test(raw)) return raw.replace(/\bEST\b|\bEDT\b/i, "ET");

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return `${new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed)} ET`;
}

function normalizeHeadline(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function storyRank(type: string, headline: string): number {
  const value = `${type} ${headline}`.toLowerCase();
  if (/\b(article|news|trade|injury|roster)\b/.test(value)) return 4;
  if (/\b(final|wins?|beats?|defeats?|result)\b/.test(value)) return 3;
  if (/\b(analysis|feature|preview)\b/.test(value)) return 2;
  return 1;
}

function storiesFromLeague(league: JsonObject): Story[] {
  const candidates = [...array(league.stories), ...array(league.cards)];
  const seenUrls = new Set<string>();
  const seenHeadlines = new Set<string>();

  return candidates
    .map((item) => object(item))
    .map((item) => {
      const headline = firstText(item, [
        "source_headline",
        "original_headline",
        "headline",
        "title",
      ]);
      const url = validUrl(item.url) || validUrl(item.source_url) || validUrl(item.link);
      const storyType = firstText(item, ["story_type", "type"]);
      return {
        headline,
        url,
        source: firstText(item, ["source_label", "source", "publisher"]),
        snapshot: firstText(item, ["snapshot", "summary", "description"]),
        why: list(item.why_it_matters ?? item.whyItMatters),
        watch: list(item.what_to_watch ?? item.whatToWatch),
        storyType,
        updated: formatEt(item.updated_at ?? item.generated_at ?? item.published_at),
      };
    })
    .filter((story) => {
      const normalized = normalizeHeadline(story.headline);
      if (!normalized || !story.url || GENERIC_TITLES.has(normalized)) return false;
      if (/\b(schedule|scoreboard)(?:\s+(?:hub|updates?|today))?\b/i.test(story.headline)) {
        return false;
      }
      if (seenUrls.has(story.url) || seenHeadlines.has(normalized)) return false;
      seenUrls.add(story.url);
      seenHeadlines.add(normalized);
      return true;
    })
    .sort(
      (a, b) =>
        storyRank(b.storyType, b.headline) - storyRank(a.storyType, a.headline)
    )
    .slice(0, 5);
}

function gamesFrom(value: unknown): Game[] {
  return array(value)
    .map((item, index) => {
      const game = object(item);
      return {
        id: firstText(game, ["id"]) || `game-${index}`,
        away: firstText(game, ["away", "away_team", "away_name"]),
        home: firstText(game, ["home", "home_team", "home_name"]),
        awayScore: firstText(game, ["away_score"]),
        homeScore: firstText(game, ["home_score"]),
        status: firstText(game, ["status_detail", "status"]),
        time: formatEt(game.game_datetime_et) || firstText(game, ["time"]),
        date: firstText(game, ["date"]),
        url:
          validUrl(game.url) || validUrl(game.source_url) || validUrl(game.link),
      };
    })
    .filter((game) => game.away && game.home);
}

function standingRows(league: JsonObject): Standing[] {
  const leagueSections = object(league.sections);
  const candidates = [
    league.standings,
    league.division_leaders,
    league.wild_card_standings,
    league.wildcard_standings,
    leagueSections.standings,
    leagueSections.division_leaders,
    leagueSections.wild_card_standings,
  ];

  for (const candidate of candidates) {
    const rows = array(candidate)
      .map(object)
      .map((row) => ({
        team: firstText(row, ["team", "name", "club"]),
        wins: firstText(row, ["wins", "w"]),
        losses: firstText(row, ["losses", "l"]),
        pct: firstText(row, ["pct", "percentage", "win_percentage"]),
        gamesBack: firstText(row, ["games_back", "gb"]),
      }))
      .filter((row) => row.team && (row.wins || row.losses || row.gamesBack));
    if (rows.length) return rows;
  }
  return [];
}

function DetailList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div className="rounded-xl bg-neutral-50 p-4">
      <h3 className="text-xs font-black uppercase tracking-wide text-neutral-600">
        {title}
      </h3>
      <ul className="mt-2 space-y-2 text-sm leading-6 text-neutral-700">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function GameGroup({ title, games }: { title: string; games: Game[] }) {
  if (!games.length) return null;
  return (
    <section>
      <h3 className="text-sm font-black uppercase tracking-wide text-red-700">
        {title}
      </h3>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {games.map((game) => (
          <article
            key={game.id}
            className="min-w-0 rounded-xl border border-neutral-200 bg-neutral-50 p-4"
          >
            <p className="break-words font-black text-neutral-950">
              {game.away} at {game.home}
            </p>
            {game.awayScore && game.homeScore ? (
              <p className="mt-2 text-lg font-bold">
                {game.away} {game.awayScore}, {game.home} {game.homeScore}
              </p>
            ) : null}
            {game.status ? (
              <p className="mt-2 text-sm font-bold text-red-700">{game.status}</p>
            ) : null}
            {game.time ? <p className="mt-1 text-sm text-neutral-600">{game.time}</p> : null}
            {game.date ? <p className="mt-1 text-xs text-neutral-500">{game.date}</p> : null}
            {game.url ? (
              <a
                href={game.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-sm font-bold text-red-700 hover:underline"
              >
                Game source
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export default function LeagueDesk({
  leagueKey,
  leagueName,
  report,
}: LeagueDeskProps) {
  const sections = object(report.sections);
  const league = object(sections[leagueKey]);
  const leagueSections = object(league.sections);
  const stories = storiesFromLeague(league);
  const live = gamesFrom(
    leagueSections.today_live ?? league.live_games ?? league.games_live
  );
  const finals = gamesFrom(
    leagueSections.today_final_scores ?? league.final_games ?? league.finals
  );
  const upcoming = gamesFrom(
    leagueSections.today_schedule ?? league.upcoming_games ?? league.upcoming
  );
  const standings = standingRows(league);
  const leadUrl = validUrl(league.url) || validUrl(league.source_url);
  const updated =
    formatEt(league.updated_at ?? league.generated_at ?? league.published_at) ||
    formatEt(report.updated_at ?? report.generated_at ?? report.published_at);
  const headline = firstText(league, ["headline"]);
  const snapshot = firstText(league, ["snapshot", "summary"]);
  const why = list(league.why_it_matters);
  const watch = list(league.what_to_watch);
  const hasGames = live.length + finals.length + upcoming.length > 0;

  return (
    <>
      <section aria-labelledby="mlb-lead" className="gsr-card p-5 sm:p-7">
        <p className="gsr-section-label">{leagueName}</p>
        <h2 id="mlb-lead" className="mt-2 text-2xl font-black sm:text-3xl">
          {headline || `${leagueName} coverage`}
        </h2>
        {snapshot ? (
          <p className="mt-4 max-w-4xl text-base leading-7 text-neutral-700">
            {snapshot}
          </p>
        ) : null}
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <DetailList title="Why It Matters" items={why} />
          <DetailList title="What To Watch" items={watch} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-4 text-sm">
          {leadUrl ? (
            <a
              href={leadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold text-red-700 hover:underline"
            >
              MLB source
            </a>
          ) : null}
          {updated ? <span className="text-neutral-500">Updated: {updated}</span> : null}
        </div>
      </section>

      {stories.length ? (
        <section aria-labelledby="mlb-headlines">
          <h2 id="mlb-headlines" className="text-2xl font-black">
            MLB Headlines
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {stories.map((story) => (
              <article key={story.url} className="gsr-card min-w-0 p-5">
                <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
                  {story.storyType ? <span>{story.storyType}</span> : null}
                  {story.source ? <span>• {story.source}</span> : null}
                </div>
                <h3 className="mt-2 break-words text-xl font-black leading-tight">
                  <a
                    href={story.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-red-700"
                  >
                    {story.headline}
                  </a>
                </h3>
                {story.snapshot ? (
                  <p className="mt-3 text-sm leading-6 text-neutral-700">
                    {story.snapshot}
                  </p>
                ) : null}
                <div className="mt-4 grid gap-3">
                  <DetailList title="Why It Matters" items={story.why} />
                  <DetailList title="What To Watch" items={story.watch} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                  <a
                    href={story.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-red-700 hover:underline"
                  >
                    Read original source
                  </a>
                  {story.updated ? (
                    <span className="text-neutral-500">Updated: {story.updated}</span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="mlb-board" className="gsr-card p-5 sm:p-7">
        <h2 id="mlb-board" className="text-2xl font-black">
          Today&apos;s MLB Board
        </h2>
        {hasGames ? (
          <div className="mt-5 space-y-6">
            <GameGroup title="Live" games={live} />
            <GameGroup title="Final" games={finals} />
            <GameGroup title="Upcoming" games={upcoming} />
          </div>
        ) : (
          <p className="mt-3 leading-7 text-neutral-700">
            The current Sports report does not include a complete MLB game board.
            Headlines and editorial context remain available above.
          </p>
        )}
      </section>

      <section aria-labelledby="pennant-race" className="gsr-card p-5 sm:p-7">
        <h2 id="pennant-race" className="text-2xl font-black">
          Pennant Race
        </h2>
        {standings.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-300">
                  <th className="p-2">Team</th>
                  <th className="p-2">W</th>
                  <th className="p-2">L</th>
                  <th className="p-2">Pct.</th>
                  <th className="p-2">GB</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => (
                  <tr key={row.team} className="border-b border-neutral-200">
                    <th className="p-2 font-bold">{row.team}</th>
                    <td className="p-2">{row.wins || "—"}</td>
                    <td className="p-2">{row.losses || "—"}</td>
                    <td className="p-2">{row.pct || "—"}</td>
                    <td className="p-2">{row.gamesBack || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 leading-7 text-neutral-700">
            Pennant Race standings are coming in the next Sports Desk data update.
          </p>
        )}
      </section>
    </>
  );
}
