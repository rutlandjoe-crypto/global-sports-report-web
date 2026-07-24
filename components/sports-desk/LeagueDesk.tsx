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
  league: "American League" | "National League";
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

function isMlbFocused(headline: string, snapshot: string): boolean {
  const prominentText = `${headline} ${snapshot}`;
  return !/\b(nfl|nba|wnba|nhl|mls|ncaa|college football|college basketball|football|basketball|hockey|soccer|golf|tennis|softball|ausl|super bowl|stanley cup|march madness|lebron(?: james)?|patrick mahomes|caitlin clark)\b/i.test(
    prominentText
  );
}

function isGenericMatchup(headline: string): boolean {
  return /^[\w .'-]+(?:\s+at|\s+vs\.?)\s+[\w .'-]+$/i.test(headline.trim());
}

function storyRank(story: Story): number {
  const value = `${story.storyType} ${story.headline} ${story.snapshot}`.toLowerCase();
  let score = 0;
  if (/\b(trade deadline|trade rumors?|trades?|dealt|acquir(?:e|ed|ing)|on the block)\b/.test(value)) score += 90;
  if (/\b(injur(?:y|ed|ies)|il\b|injured list|availability|scratch(?:ed)?|out for|day-to-day)\b/.test(value)) score += 85;
  if (/\b(roster|call-?up|promot(?:e|ed|ion)|option(?:ed)?|designated for assignment|dfa|waiver|release(?:d)?|sign(?:s|ed|ing)?)\b/.test(value)) score += 75;
  if (/\b(standings?|pennant|wild card|playoff|division race|contender|eliminat(?:e|ed|ion))\b/.test(value)) score += 70;
  if (/\b(starting pitcher|probable pitcher|rotation|bullpen|pitching availability|pitch count)\b/.test(value)) score += 65;
  if (/\b(final|wins?|won|beats?|defeats?|walk-?off|no-hitter|perfect game)\b/.test(value)) score += 45;
  if (/\b(live|in progress|inning)\b/.test(value)) score += 35;
  if (/\b(analysis|feature|legacy|preview)\b/.test(value)) score += 10;
  if (isGenericMatchup(story.headline)) score -= 80;
  return score;
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
      if (!isMlbFocused(story.headline, story.snapshot)) return false;
      if (/\b(schedule|scoreboard)(?:\s+(?:hub|updates?|today))?\b/i.test(story.headline)) {
        return false;
      }
      if (seenUrls.has(story.url) || seenHeadlines.has(normalized)) return false;
      seenUrls.add(story.url);
      seenHeadlines.add(normalized);
      return true;
    })
    .sort((a, b) => storyRank(b) - storyRank(a))
    .slice(0, 6);
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

function standingLeague(value: unknown): Standing["league"] | "" {
  const candidate = text(value).toLowerCase();
  if (candidate === "al" || candidate.includes("american")) return "American League";
  if (candidate === "nl" || candidate.includes("national")) return "National League";
  return "";
}

function rowsFromStandingValue(
  value: unknown,
  inheritedLeague: Standing["league"] | "" = ""
): Standing[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const row = object(item);
      const nested = row.teams ?? row.entries ?? row.standings ?? row.records ?? row.rows;
      if (nested) {
        return rowsFromStandingValue(
          nested,
          standingLeague(row.league ?? row.league_name ?? row.name) ||
            inheritedLeague
        );
      }

      const teamObject = object(row.team);
      const team =
        firstText(row, ["team_name", "name", "club"]) ||
        firstText(teamObject, ["displayName", "shortDisplayName", "name"]);
      const leagueName =
        standingLeague(row.league ?? row.league_name ?? row.league_abbr) ||
        inheritedLeague;
      const wins = firstText(row, ["wins", "w"]);
      const losses = firstText(row, ["losses", "l"]);
      const pct = firstText(row, [
        "pct",
        "percentage",
        "win_percentage",
        "winning_percentage",
      ]);
      const gamesBack = firstText(row, ["games_back", "gb", "gamesBehind"]);

      return team && leagueName && wins && losses
        ? [{ league: leagueName, team, wins, losses, pct, gamesBack }]
        : [];
    });
  }

  return Object.entries(object(value)).flatMap(([key, nested]) =>
    rowsFromStandingValue(nested, standingLeague(key) || inheritedLeague)
  );
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
    const rows = rowsFromStandingValue(candidate);
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
  const leadStory = stories[0];
  const headlineStories = leadStory ? stories.slice(1, 5) : stories.slice(0, 5);
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
  const leagueLeadUrl = validUrl(league.url) || validUrl(league.source_url);
  const updated =
    formatEt(league.updated_at ?? league.generated_at ?? league.published_at) ||
    formatEt(report.updated_at ?? report.generated_at ?? report.published_at);
  const reportHeadline = firstText(league, ["headline"]);
  const reportSnapshot = firstText(league, ["snapshot", "summary"]);
  const reportIsMlbFocused = isMlbFocused(reportHeadline, reportSnapshot);
  const headline =
    leadStory?.headline ||
    (reportIsMlbFocused ? reportHeadline : "") ||
    `${leagueName} coverage`;
  const snapshot =
    leadStory?.snapshot || (reportIsMlbFocused ? reportSnapshot : "");
  const why = leadStory?.why.length ? leadStory.why : list(league.why_it_matters);
  const watch = leadStory?.watch.length
    ? leadStory.watch
    : list(league.what_to_watch);
  const leadUrl = leadStory?.url || (reportIsMlbFocused ? leagueLeadUrl : "");
  const leadSource = leadStory?.source || leagueName;
  const leadUpdated = leadStory?.updated || updated;
  const hasGames = live.length + finals.length + upcoming.length > 0;

  return (
    <>
      <section
        id="top-stories"
        aria-labelledby="mlb-lead"
        className="gsr-card scroll-mt-4 p-5 sm:p-7"
      >
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
              {leadSource} source
            </a>
          ) : null}
          {leadUpdated ? (
            <span className="text-neutral-500">Updated: {leadUpdated}</span>
          ) : null}
        </div>
      </section>

      {headlineStories.length ? (
        <section
          aria-labelledby="mlb-headlines"
          className="scroll-mt-4"
        >
          <h2 id="mlb-headlines" className="text-2xl font-black">
            MLB Headlines
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {headlineStories.map((story) => (
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

      <section
        id="scoreboard"
        aria-labelledby="mlb-board"
        className="gsr-card scroll-mt-4 p-5 sm:p-7"
      >
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

      <section
        id="pennant-race"
        aria-labelledby="pennant-race-heading"
        className="gsr-card scroll-mt-4 p-5 sm:p-7"
      >
        <h2 id="pennant-race-heading" className="text-2xl font-black">
          Pennant Race
        </h2>
        {standings.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-300">
                  <th className="p-2">League</th>
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
                    <td className="whitespace-nowrap p-2">
                      {row.league === "American League" ? "AL" : "NL"}
                    </td>
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
            The current local MLB report does not include verified standings.
            Scores and reporting above remain available without estimated records
            or invented games-back figures.
          </p>
        )}
      </section>
    </>
  );
}
