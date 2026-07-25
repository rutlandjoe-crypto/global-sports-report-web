type JsonObject = Record<string, unknown>;

export type LeagueDeskProps = {
  leagueKey: string;
  leagueName: string;
  report: JsonObject;
  config?: LeagueDeskConfig;
};

export type LeagueDeskConfig = {
  slug: string;
  sport:
    | "baseball"
    | "football"
    | "college-football"
    | "soccer"
    | "wnba"
    | "fantasy";
  headlinesTitle: string;
  scoreboardTitle: string;
  scoreboardEmpty: string;
  showScoreboard?: boolean;
  standingsTitle: string;
  standingsAnchor: string;
  standingsEmpty: string;
  fallbackHeadline: string;
  fallbackSummary: string;
  fallbackHeadlines?: Array<{
    label: string;
    headline: string;
    summary: string;
  }>;
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
  group: string;
  division: string;
  team: string;
  wins: string;
  losses: string;
  ties: string;
  pct: string;
  gamesBack: string;
};

const MLB_CONFIG: LeagueDeskConfig = {
  slug: "mlb",
  sport: "baseball",
  headlinesTitle: "MLB Headlines",
  scoreboardTitle: "Today’s MLB Board",
  scoreboardEmpty:
    "The current Sports report does not include a complete MLB game board. Headlines and editorial context remain available above.",
  standingsTitle: "Pennant Race",
  standingsAnchor: "pennant-race",
  standingsEmpty:
    "The current local MLB report does not include verified standings. Scores and reporting above remain available without estimated records or invented games-back figures.",
  fallbackHeadline: "MLB coverage",
  fallbackSummary: "",
};

const GENERIC_TITLES = new Set([
  "mlb",
  "nfl",
  "ncaafb",
  "college football",
  "soccer",
  "wnba",
  "fantasy",
  "mlb report",
  "nfl report",
  "college football report",
  "soccer report",
  "wnba report",
  "fantasy report",
  "sports newsroom update",
  "latest mlb news",
  "latest nfl news",
  "latest soccer news",
  "latest wnba news",
  "latest fantasy news",
  "mlb news",
  "nfl news",
  "baseball news",
  "football news",
  "soccer news",
  "wnba news",
  "fantasy news",
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

function sourceFromUrl(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
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

function isLeagueFocused(
  headline: string,
  snapshot: string,
  sport: LeagueDeskConfig["sport"]
): boolean {
  const prominentText = `${headline} ${snapshot}`;
  const excluded =
    sport === "football"
      ? /\b(mlb|nba|wnba|nhl|mls|college football|college basketball|baseball|basketball|hockey|soccer|golf|tennis|softball|stanley cup|march madness)\b/i
      : sport === "fantasy"
        ? /$^/
      : sport === "wnba"
        ? /\b(nfl|nba|mlb|nhl|mls|college football|college basketball|baseball|hockey|soccer|golf|tennis|softball|super bowl|stanley cup|march madness)\b/i
      : sport === "soccer"
        ? /\b(nfl|mlb|nba|wnba|nhl|college football|college basketball|baseball|basketball|hockey|golf|tennis|softball|super bowl|stanley cup|march madness)\b/i
      : sport === "college-football"
        ? /\b(nfl|mlb|nba|wnba|nhl|mls|college basketball|baseball|basketball|hockey|soccer|golf|tennis|softball|super bowl|stanley cup|march madness)\b/i
        : /\b(nfl|nba|wnba|nhl|mls|ncaa|college football|college basketball|football|basketball|hockey|soccer|golf|tennis|softball|ausl|super bowl|stanley cup|march madness|lebron(?: james)?|patrick mahomes|caitlin clark)\b/i;
  return !excluded.test(prominentText);
}

function isGenericMatchup(headline: string): boolean {
  return /^[\w .'-]+(?:\s+at|\s+vs\.?)\s+[\w .'-]+$/i.test(headline.trim());
}

function storyRank(story: Story, sport: LeagueDeskConfig["sport"]): number {
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
  if (
    sport !== "baseball" &&
    /\b(quarterback|training camp|depth chart|coaching|draft|contract|roster|division)\b/.test(
      value
    )
  ) {
    score += 30;
  }
  if (isGenericMatchup(story.headline)) score -= 80;
  return score;
}

function storiesFromLeague(
  league: JsonObject,
  config: LeagueDeskConfig
): Story[] {
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
      const rawSnapshot = firstText(item, [
        "snapshot",
        "summary",
        "description",
      ]);
      const snapshot =
        rawSnapshot.length > 200 && /(?:,\s*|\s)\w{1,2}$/i.test(rawSnapshot)
          ? ""
          : rawSnapshot;
      return {
        headline,
        url,
        source:
          firstText(item, ["source_label", "source", "publisher"]) ||
          sourceFromUrl(url),
        snapshot,
        why: list(item.why_it_matters ?? item.whyItMatters),
        watch: list(item.what_to_watch ?? item.whatToWatch),
        storyType,
        updated: formatEt(item.updated_at ?? item.generated_at ?? item.published_at),
      };
    })
    .filter((story) => {
      const normalized = normalizeHeadline(story.headline);
      if (!normalized || !story.url || GENERIC_TITLES.has(normalized)) return false;
      if (story.storyType.toLowerCase() === "schedule") return false;
      if (!isLeagueFocused(story.headline, story.snapshot, config.sport)) {
        return false;
      }
      if (/\b(schedule|scoreboard)(?:\s+(?:hub|updates?|today))?\b/i.test(story.headline)) {
        return false;
      }
      if (
        isGenericMatchup(story.headline) &&
        (/\/scoreboard\b/i.test(story.url) || /\bboard for\b/i.test(story.snapshot))
      ) {
        return false;
      }
      if (seenUrls.has(story.url) || seenHeadlines.has(normalized)) return false;
      seenUrls.add(story.url);
      seenHeadlines.add(normalized);
      return true;
    })
    .sort((a, b) => storyRank(b, config.sport) - storyRank(a, config.sport))
    .slice(0, 7);
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

function standingGroup(value: unknown): string {
  const candidate = text(value).toLowerCase();
  if (candidate === "afc" || candidate.includes("american football")) return "AFC";
  if (candidate === "nfc" || candidate.includes("national football")) return "NFC";
  if (candidate === "al" || candidate.includes("american")) return "American League";
  if (candidate === "nl" || candidate.includes("national")) return "National League";
  return text(value);
}

function rowsFromStandingValue(
  value: unknown,
  inheritedGroup = "",
  inheritedDivision = ""
): Standing[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const row = object(item);
      const nested = row.teams ?? row.entries ?? row.standings ?? row.records ?? row.rows;
      if (nested) {
        return rowsFromStandingValue(
          nested,
          standingGroup(
            row.conference ?? row.league ?? row.league_name ?? inheritedGroup
          ),
          firstText(row, ["division", "division_name", "name"]) ||
            inheritedDivision
        );
      }

      const teamObject = object(row.team);
      const team =
        firstText(row, ["team_name", "name", "club"]) ||
        firstText(teamObject, ["displayName", "shortDisplayName", "name"]);
      const group =
        standingGroup(
          row.conference ?? row.league ?? row.league_name ?? row.league_abbr
        ) || inheritedGroup;
      const division =
        firstText(row, ["division", "division_name"]) || inheritedDivision;
      const wins = firstText(row, ["wins", "w"]);
      const losses = firstText(row, ["losses", "l"]);
      const ties = firstText(row, ["ties", "t"]);
      const pct = firstText(row, [
        "pct",
        "percentage",
        "win_percentage",
        "winning_percentage",
      ]);
      const gamesBack = firstText(row, ["games_back", "gb", "gamesBehind"]);

      return team && wins && losses
        ? [{ group, division, team, wins, losses, ties, pct, gamesBack }]
        : [];
    });
  }

  return Object.entries(object(value)).flatMap(([key, nested]) => {
    const keyGroup = standingGroup(key);
    const looksLikeGroup =
      /^(al|nl|afc|nfc)$/i.test(key) ||
      /\b(american|national)(?: football)? (?:league|conference)\b/i.test(key);
    return rowsFromStandingValue(
      nested,
      looksLikeGroup ? keyGroup : inheritedGroup,
      looksLikeGroup ? inheritedDivision : key
    );
  });
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
  config: suppliedConfig,
}: LeagueDeskProps) {
  const config = suppliedConfig ?? MLB_CONFIG;
  const sections = object(report.sections);
  const league = object(sections[leagueKey]);
  const leagueSections = object(league.sections);
  const liveStories = storiesFromLeague(league, config);
  const fallbackStories: Story[] = (config.fallbackHeadlines ?? []).map(
    (story) => ({
      headline: story.headline,
      url: "",
      source: story.label,
      snapshot: story.summary,
      why: [],
      watch: [],
      storyType: "Coverage lane",
      updated: "",
    })
  );
  const stories = liveStories.length
    ? [...liveStories, ...fallbackStories.slice(0, Math.max(0, 7 - liveStories.length))]
    : fallbackStories;
  const leadStory = liveStories[0];
  const headlineStories = liveStories.length
    ? stories.slice(1, 7)
    : fallbackStories.slice(0, 6);
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
  const reportIsLeagueFocused = isLeagueFocused(
    reportHeadline,
    reportSnapshot,
    config.sport
  );
  const headline =
    leadStory?.headline ||
    (reportIsLeagueFocused ? reportHeadline : "") ||
    config.fallbackHeadline;
  const snapshot =
    leadStory?.snapshot ||
    (reportIsLeagueFocused ? reportSnapshot : "") ||
    config.fallbackSummary;
  const why = leadStory?.why.length ? leadStory.why : list(league.why_it_matters);
  const watch = leadStory?.watch.length
    ? leadStory.watch
    : list(league.what_to_watch);
  const leadUrl =
    leadStory?.url || (reportIsLeagueFocused ? leagueLeadUrl : "");
  const hasSourcedLead = Boolean(
    leadStory || (reportIsLeagueFocused && reportHeadline)
  );
  const leadSource = leadStory?.source || leagueName;
  const leadUpdated = leadStory?.updated || (hasSourcedLead ? updated : "");
  const hasGames = live.length + finals.length + upcoming.length > 0;

  return (
    <>
      <section
        id="top-stories"
        aria-labelledby={`${config.slug}-lead`}
        className="gsr-card scroll-mt-4 p-5 sm:p-7"
      >
        <p className="gsr-section-label">
          {hasSourcedLead ? leagueName : `${leagueName} Coverage Lane`}
        </p>
        <h2
          id={`${config.slug}-lead`}
          className="mt-2 text-2xl font-black sm:text-3xl"
        >
          {headline || config.fallbackHeadline}
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
        <section aria-labelledby={`${config.slug}-headlines`} className="scroll-mt-4">
          <h2 id={`${config.slug}-headlines`} className="text-2xl font-black">
            {config.headlinesTitle}
          </h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {headlineStories.map((story) => (
              <article
                key={`${story.headline}-${story.url}`}
                className="gsr-card min-w-0 p-5"
              >
                <div className="flex flex-wrap gap-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
                  {story.storyType ? <span>{story.storyType}</span> : null}
                  {story.source ? <span>• {story.source}</span> : null}
                </div>
                <h3 className="mt-2 break-words text-xl font-black leading-tight">
                  {story.url ? (
                    <a
                      href={story.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-red-700"
                    >
                      {story.headline}
                    </a>
                  ) : (
                    story.headline
                  )}
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
                {story.url || story.updated ? (
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
                    {story.url ? (
                      <a
                        href={story.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-red-700 hover:underline"
                      >
                        Read original source
                      </a>
                    ) : null}
                    {story.updated ? (
                      <span className="text-neutral-500">
                        Updated: {story.updated}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {config.showScoreboard !== false ? (
        <section
          id="scoreboard"
          aria-labelledby={`${config.slug}-board`}
          className="gsr-card scroll-mt-4 p-5 sm:p-7"
        >
          <h2 id={`${config.slug}-board`} className="text-2xl font-black">
            {config.scoreboardTitle}
          </h2>
          {hasGames ? (
            <div className="mt-5 space-y-6">
              <GameGroup title="Live" games={live} />
              <GameGroup title="Final" games={finals} />
              <GameGroup title="Upcoming" games={upcoming} />
            </div>
          ) : (
            <p className="mt-3 leading-7 text-neutral-700">
              {config.scoreboardEmpty}
            </p>
          )}
        </section>
      ) : null}

      <section
        id={config.standingsAnchor}
        aria-labelledby={`${config.standingsAnchor}-heading`}
        className="gsr-card scroll-mt-4 p-5 sm:p-7"
      >
        <h2
          id={`${config.standingsAnchor}-heading`}
          className="text-2xl font-black"
        >
          {config.standingsTitle}
        </h2>
        {standings.length ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-300">
                  <th className="p-2">
                    {config.sport !== "baseball" ? "Conference" : "League"}
                  </th>
                  {config.sport !== "baseball" ? (
                    <th className="p-2">Division</th>
                  ) : null}
                  <th className="p-2">Team</th>
                  <th className="p-2">W</th>
                  <th className="p-2">L</th>
                  {config.sport !== "baseball" ? (
                    <th className="p-2">T</th>
                  ) : null}
                  <th className="p-2">Pct.</th>
                  {config.sport === "baseball" ? (
                    <th className="p-2">GB</th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {standings.map((row) => (
                  <tr key={row.team} className="border-b border-neutral-200">
                    <td className="whitespace-nowrap p-2">
                      {row.group === "American League"
                        ? "AL"
                        : row.group === "National League"
                          ? "NL"
                          : row.group || "—"}
                    </td>
                    {config.sport !== "baseball" ? (
                      <td className="whitespace-nowrap p-2">
                        {row.division || "—"}
                      </td>
                    ) : null}
                    <th className="p-2 font-bold">{row.team}</th>
                    <td className="p-2">{row.wins || "—"}</td>
                    <td className="p-2">{row.losses || "—"}</td>
                    {config.sport !== "baseball" ? (
                      <td className="p-2">{row.ties || "—"}</td>
                    ) : null}
                    <td className="p-2">{row.pct || "—"}</td>
                    {config.sport === "baseball" ? (
                      <td className="p-2">{row.gamesBack || "—"}</td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 leading-7 text-neutral-700">{config.standingsEmpty}</p>
        )}
      </section>
    </>
  );
}
