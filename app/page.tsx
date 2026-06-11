import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import EditorialStandard from "@/components/EditorialStandard";
import SocialIconLinks from "@/app/SocialIconLinks";

type AnyObj = Record<string, any>;

const SITE = {
  name: "Global Sports Report",
  tagline: "Built for journalists, by a journalist.",
  topic: "Sports",
  descriptor:
    "Global Sports Report follows the stories shaping the sports world in real time: playoff races, injuries, roster pressure, coaching decisions, analytics, betting movement and the developments driving the next news cycle across MLB, NBA, NFL, NHL, soccer and the wider sports landscape.",
};

const TOOLKIT = [
  ["ESPN", "https://www.espn.com/"],
  ["The Athletic", "https://www.nytimes.com/athletic/"],
  ["Sports Reference", "https://www.sports-reference.com/"],
  ["Baseball Savant", "https://baseballsavant.mlb.com/"],
  ["Spotrac", "https://www.spotrac.com/"],
];

const SCOREBOARD_SITES = [
  ["ESPN Scoreboards", "https://www.espn.com/scoreboard"],
  ["CBS Sports Scores", "https://www.cbssports.com/"],
  ["FOX Sports Scores", "https://www.foxsports.com/scores"],
  ["Yahoo Sports Scores", "https://sports.yahoo.com/scoreboard/"],
  ["NCAA Scoreboards", "https://www.ncaa.com/scoreboard"],
];

const GSR_NETWORK = [
  ["Sports", "https://globalsportsreport.com"],
  ["AI", "https://globalaireport.news"],
  ["Politics", "https://globalpoliticsreport.com"],
  ["Entertainment", "https://globalentertainmentreport.com"],
  ["Betting", "https://globalbettingreport.com"],
];

const LEAGUE_LABELS: AnyObj = {
  breaking_news: "Breaking Sports News",
  mlb: "MLB",
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  ncaafb: "College Football",
  soccer: "Soccer",
  wnba: "WNBA",
  betting_odds: "Betting Odds",
  fantasy: "Fantasy",
};

const LEAGUE_DEFAULT_URLS: AnyObj = {
  breaking_news: "https://www.espn.com/",
  mlb: "https://www.espn.com/mlb/",
  nba: "https://www.espn.com/nba/",
  nhl: "https://www.espn.com/nhl/",
  nfl: "https://www.espn.com/nfl/",
  ncaafb: "https://www.espn.com/college-football/",
  soccer: "https://www.espn.com/soccer/",
  wnba: "https://www.espn.com/wnba/",
  betting_odds: "https://globalbettingreport.com",
  fantasy: "https://www.espn.com/fantasy/",
};

const BAD_CONTENT_PHRASES = [
  "source refresh",
  "refresh needed",
  "needed before publication",
  "strict mode",
  "current-day update pending",
  "feed checked",
  "required date",
  "rebuild distribution",
  "bad or stale",
  "not allowed onto the homepage",
  "no verified data point attached yet",
  "no current items available",
  "undefined",
];

function readReport(): AnyObj {
  try {
    const file = path.join(process.cwd(), "public", "latest_report.json");
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function cleanText(value: any): string {
  if (value === null || value === undefined) return "";

  if (Array.isArray(value)) {
    return value.map(cleanText).filter(Boolean).join(" • ");
  }

  if (typeof value === "object") {
    return Object.values(value).map(cleanText).filter(Boolean).join(" • ");
  }

  return String(value)
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(value: any): string {
  return cleanText(value).toLowerCase();
}

function isInternalReportLabel(value: any): boolean {
  const text = cleanText(value);
  if (!text) return false;

  if (
    /^(global sports report|mlb|nba|nhl|nfl|ncaafb|ncaaf|college football|soccer|global soccer|betting(?: odds)?|fantasy)(?: (?:pro|advanced|odds|sports))? report\s*\|\s*\d{4}-\d{2}-\d{2}/i.test(
      text
    )
  ) {
    return true;
  }

  return /\breport\s*\|\s*\d{4}-\d{2}-\d{2}\b/i.test(text) && text.length <= 90;
}

function publicText(value: any): string {
  const text = cleanText(value);
  return isInternalReportLabel(text) ? "" : text;
}

function isBadContent(value: any): boolean {
  const text = normalizeText(value);
  if (!text) return true;
  if (isInternalReportLabel(value)) return true;
  return BAD_CONTENT_PHRASES.some((phrase) => text.includes(phrase));
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();

  return items
    .map((item) => cleanText(item))
    .filter((item) => item && !isBadContent(item))
    .filter((item) => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function asList(value: any): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return unique(
      value.flatMap((item) =>
        cleanText(item)
          .split(/\n|•|\|/)
          .map((x) => x.trim())
          .filter(Boolean)
      )
    );
  }

  if (typeof value === "object") {
    return unique(
      Object.values(value).flatMap((item) =>
        cleanText(item)
          .split(/\n|•|\|/)
          .map((x) => x.trim())
          .filter(Boolean)
      )
    );
  }

  return unique(
    cleanText(value)
      .split(/\n|•|\|/)
      .map((x) => x.trim())
      .filter(Boolean)
  );
}

function isValidUrl(value: any): boolean {
  const url = cleanText(value);
  return url.startsWith("http://") || url.startsWith("https://");
}

function findUrlInText(value: any): string {
  const text = cleanText(value);
  const match = text.match(/https?:\/\/[^\s"'<>]+/);
  return match ? match[0].replace(/[),.;]+$/, "") : "";
}

function extractBestUrl(section: AnyObj, key: string): string {
  const directCandidates = [
    section.url,
    section.link,
    section.source_url,
    section.sourceUrl,
    section.href,
    section.web_url,
    section.webUrl,
  ];

  for (const candidate of directCandidates) {
    if (isValidUrl(candidate)) return cleanText(candidate);
  }

  if (Array.isArray(section.links)) {
    for (const link of section.links) {
      if (typeof link === "string" && isValidUrl(link)) return cleanText(link);

      if (link && typeof link === "object") {
        const candidates = [link.url, link.href, link.link, link.source_url];

        for (const candidate of candidates) {
          if (isValidUrl(candidate)) return cleanText(candidate);
        }
      }
    }
  }

  const textSources = [
    section.content,
    section.summary,
    section.snapshot,
    section.description,
    section.key_storylines,
    section.advanced,
    section.final_scores,
    section.live_games,
    section.upcoming,
  ];

  for (const source of textSources) {
    const found = findUrlInText(source);
    if (found) return found;
  }

  return LEAGUE_DEFAULT_URLS[key] || "https://www.espn.com/";
}

function extractSectionLines(content: string, heading: string): string[] {
  if (!content) return [];

  const lines = content.split("\n");
  const startIndex = lines.findIndex(
    (line) => line.trim().toUpperCase() === heading.toUpperCase()
  );

  if (startIndex === -1) return [];

  const output: string[] = [];

  for (let i = startIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) continue;

    const isNextHeading =
      /^[A-Z0-9\s&/()-]{4,}$/.test(line) &&
      !line.includes(".") &&
      !line.includes(":");

    if (isNextHeading) break;

    output.push(line.replace(/^- /, "").trim());
  }

  return unique(output);
}

function extractHeadline(section: AnyObj): string {
  const headlineLines = extractSectionLines(section.content || "", "HEADLINE");

  return (
    publicText(section.public_headline) ||
    publicText(section.headline) ||
    publicText(headlineLines[0]) ||
    publicText(section.label) ||
    "Sports newsroom update"
  );
}

function extractSnapshot(section: AnyObj): string {
  const snapshotLines = extractSectionLines(section.content || "", "SNAPSHOT");

  return (
    cleanText(section.summary) ||
    cleanText(section.snapshot) ||
    cleanText(snapshotLines[0]) ||
    cleanText(section.content).slice(0, 260) ||
    "Latest verified sports report generated for newsroom review."
  );
}

function sectionToStory(key: string, section: AnyObj): AnyObj {
  const content = section.content || "";

  const keyData = [
    ...asList(section.key_data),
    ...extractSectionLines(content, "KEY DATA POINTS"),
    ...asList(section.key_storylines),
    ...asList(section.final_scores),
    ...asList(section.live_games),
    ...asList(section.upcoming),
    ...asList(section.advanced?.sections?.key_data_points),
    ...asList(section.advanced?.sections?.matchup_flags),
    ...asList(section.advanced),
  ];

  const why = [
    ...asList(section.why_it_matters),
    ...extractSectionLines(content, "WHY IT MATTERS"),
    ...asList(section.advanced?.sections?.why_it_matters),
  ];

  const watch = [
    ...asList(section.what_to_watch),
    ...asList(section.story_angles),
    ...extractSectionLines(content, "STORY ANGLES"),
    ...extractSectionLines(content, "LIVE"),
    ...extractSectionLines(content, "UPCOMING"),
    ...extractSectionLines(content, "FINAL SCORES"),
    ...asList(section.advanced?.sections?.story_angles),
    ...asList(section.advanced?.sections?.statcast_watch),
    ...asList(section.advanced?.sections?.league_efficiency_watch),
  ];

  return {
    id: key,
    key,
    league: publicText(section.label) || publicText(section.title) || LEAGUE_LABELS[key] || key.toUpperCase(),
    title: publicText(section.title) || LEAGUE_LABELS[key] || key.toUpperCase(),
    headline: extractHeadline(section),
    summary: extractSnapshot(section),
    snapshot: extractSnapshot(section),
    updated_at: section.updated_at,
    source_file: section.source_file,
    url: extractBestUrl(section, key),
    key_data: unique(keyData).slice(0, 8),
    why_it_matters: unique(why).slice(0, 6),
    what_to_watch: unique(watch).slice(0, 8),
    story_angles: unique(asList(section.story_angles)).slice(0, 6),
    story_type: section.story_type || "analysis",
    priority_score: section.priority_score || 0,
  };
}

function normalizeStory(story: AnyObj, index: number): AnyObj {
  const key = cleanText(story.key || story.id || story.league || story.category || `story-${index}`);
  const label =
    publicText(story.label) ||
    publicText(story.category) ||
    publicText(story.league) ||
    LEAGUE_LABELS[key] ||
    "Sports Watch";

  const title = publicText(story.title) || publicText(story.league) || label;
  const url = extractBestUrl(story, key);

  return {
    ...story,
    id: key || `story-${index}`,
    key,
    league: label,
    label,
    title,
    headline:
      publicText(story.public_headline) ||
      publicText(story.headline) ||
      publicText(story.label) ||
      publicText(story.name) ||
      publicText(story.title),
    summary: cleanText(story.summary || story.snapshot || story.description || story.body),
    snapshot: cleanText(story.snapshot || story.summary || story.description || story.body),
    url,
    key_data: asList(story.key_data || story.keyData || story.data || story.metrics).slice(0, 8),
    why_it_matters: asList(story.why_it_matters || story.whyItMatters || story.why).slice(0, 6),
    what_to_watch: asList(story.what_to_watch || story.whatToWatch || story.watch).slice(0, 8),
    story_angles: asList(story.story_angles || story.storyAngles || story.angles).slice(0, 6),
  };
}

function normalizeArrayStories(candidates: AnyObj[], sourceName: string): AnyObj[] {
  return candidates
    .filter((story) => story && typeof story === "object")
    .map((story, index) =>
      normalizeStory(
        {
          ...story,
          source_collection: sourceName,
        },
        index
      )
    );
}

function getStories(report: AnyObj): AnyObj[] {
  const publicCollections = [
    ["homepage_cards", report.homepage_cards],
    ["live_newsroom", report.live_newsroom],
    ["stories", report.stories],
    ["cards", report.cards],
    ["news", report.news],
    ["headlines", report.headlines],
    ["items", report.items],
    ["articles", report.articles],
  ];

  for (const [sourceName, candidates] of publicCollections) {
    if (Array.isArray(candidates) && candidates.length) {
      const normalized = normalizeArrayStories(candidates, sourceName as string).filter(isPublishableStory);
      if (normalized.length) return normalized;
    }

    if (candidates && typeof candidates === "object" && !Array.isArray(candidates)) {
      const normalized = Object.entries(candidates)
        .map(([key, value]: [string, any], index) => {
          if (value && typeof value === "object") {
            return normalizeStory(
              {
                id: key,
                key,
                league: value.league || value.label || LEAGUE_LABELS[key] || key.toUpperCase(),
                source_collection: sourceName,
                ...value,
              },
              index
            );
          }

          return normalizeStory(
            {
              id: key,
              key,
              league: LEAGUE_LABELS[key] || key.toUpperCase(),
              headline: cleanText(value),
              source_collection: sourceName,
            },
            index
          );
        })
        .filter(isPublishableStory);

      if (normalized.length) return normalized;
    }
  }

  if (Array.isArray(report.sections) && report.sections.length) {
    return report.sections.map((section: AnyObj, index: number) =>
      sectionToStory(section.key || section.id || `section-${index}`, section || {})
    );
  }

  if (report.sections && typeof report.sections === "object") {
    return Object.entries(report.sections).map(([key, value]: [string, any]) =>
      sectionToStory(key, value || {})
    );
  }

  return [];
}

function getSpotlightStories(report: AnyObj, key: "live_newsroom" | "editor_signals"): AnyObj[] {
  const raw = report[key];

  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item) => item && typeof item === "object")
    .map((item, index) => normalizeStory(item, index))
    .filter(isPublishableStory);
}

function storyTitle(story: AnyObj, index: number): string {
  return (
    publicText(story.public_headline) ||
    publicText(story.headline) ||
    publicText(story.label) ||
    publicText(story.name) ||
    publicText(story.title) ||
    `Sports Storyline ${index + 1}`
  );
}

function storyUrl(story: AnyObj): string {
  const url = cleanText(story.url) || cleanText(story.link) || cleanText(story.source_url);
  return isValidUrl(url) ? url : "https://www.espn.com/";
}

function storySummary(story: AnyObj): string {
  return (
    cleanText(story.snapshot) ||
    cleanText(story.summary) ||
    cleanText(story.description) ||
    cleanText(story.body) ||
    "A sports storyline is moving through the board as results, injuries and roster pressure develop."
  );
}

function storyLabel(story: AnyObj): string {
  return publicText(story.label) || publicText(story.category) || publicText(story.league) || publicText(story.title) || "Sports Watch";
}

function isPublishableStory(story: AnyObj): boolean {
  if (!story || typeof story !== "object") return false;

  const title = storyTitle(story, 0);
  const summary = storySummary(story);
  const text = `${title} ${summary}`;

  if (!title) return false;
  if (isBadContent(text)) return false;

  return true;
}

function cleanSignals(items: string[]): string[] {
  return unique(items).slice(0, 6);
}

function buildBriefingItems(stories: AnyObj[], rawSignals: string[]): string[] {
  const fromStories = stories.map((story, index) => {
    const label = storyLabel(story);
    const title = storyTitle(story, index);
    return `${label}: ${title}`;
  });

  return cleanSignals([...fromStories, ...rawSignals]);
}

function spotlightItemsFromStories(stories: AnyObj[]): string[] {
  return cleanSignals(
    stories.map((story, index) => {
      const label = storyLabel(story);
      const title = storyTitle(story, index);
      return `${label}: ${title}`;
    })
  );
}


function AdvertiseWithGsrBlock() {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-black uppercase tracking-wide text-red-700">
        Advertise With GSR Network
      </p>
      <p className="mt-2 text-lg font-black text-neutral-950">
        Sponsorship, partnership, affiliate and custom campaign opportunities are open.
      </p>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-neutral-700">
        GSR Network offers clearly labeled placements for brands, events, data companies, media partners and vertical-specific advertisers across all five platforms.
      </p>
    </section>
  );
}
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-red-700">
        {cleanText(title)}
      </h2>
      {children}
    </section>
  );
}

function LineList({ items }: { items: string[] }) {
  const safe = unique(items).slice(0, 8);

  if (!safe.length) {
    return (
      <p className="text-sm leading-6 text-neutral-700">
        Additional verified reporting, injury developments and league updates are still moving across the newsroom board.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {safe.map((item, i) => (
        <p key={i} className="border-b border-neutral-100 pb-2 text-sm leading-6 text-neutral-800">
          {item}
        </p>
      ))}
    </div>
  );
}

function NewsroomBriefing({ items }: { items: string[] }) {
  const safe = cleanSignals(items);

  return (
    <div className="rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm">
      <p className="mb-3 text-xs font-black uppercase tracking-wide text-red-700">
        Live Newsroom Briefing
      </p>

      {safe.length ? (
        <div className="space-y-2">
          {safe.map((item, i) => (
            <p key={i} className="border-b border-neutral-100 pb-2 text-sm leading-6 text-neutral-800">
              {item}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-neutral-700">
          Tracking the developments driving today’s sports conversation: injuries, playoff pressure, roster movement, performance trends and league-wide momentum shifts.
        </p>
      )}
    </div>
  );
}

function LinkList({ items }: { items: string[][] }) {
  return (
    <div className="space-y-2">
      {items.map(([name, url]) => (
        <a
          key={name}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm font-bold text-red-800 hover:bg-red-50"
        >
          {name}
        </a>
      ))}
    </div>
  );
}

function StoryCard({ story, index }: { story: AnyObj; index: number }) {
  const title = storyTitle(story, index);
  const url = storyUrl(story);
  const summary = storySummary(story);
  const label = storyLabel(story);

  const keyData = asList(story.key_data || story.keyData || story.data || story.metrics);
  const why = asList(story.why_it_matters || story.whyItMatters || story.why);
  const watch = asList(story.what_to_watch || story.whatToWatch || story.watch);
  const angles = asList(story.story_angles || story.storyAngles || story.angles);

  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-red-700">
        {label}
      </p>

      <h3 className="text-xl font-black leading-tight text-neutral-950">
        <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-red-700">
          {title}
        </a>
      </h3>

      <p className="mt-3 text-sm leading-6 text-neutral-700">{summary}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-neutral-50 p-3">
          <p className="mb-2 text-xs font-black uppercase text-neutral-600">Data Points</p>
          <LineList items={keyData.length ? keyData : [title]} />
        </div>

        <div className="rounded-xl bg-neutral-50 p-3">
          <p className="mb-2 text-xs font-black uppercase text-neutral-600">Story Stakes</p>
          <LineList
            items={
              why.length
                ? why
                : ["The latest development can reshape momentum, pressure, playoff positioning or the broader sports conversation."]
            }
          />
        </div>

        <div className="rounded-xl bg-neutral-50 p-3">
          <p className="mb-2 text-xs font-black uppercase text-neutral-600">Next Read</p>
          <LineList
            items={
              watch.length
                ? watch
                : ["Watch for injury clarity, lineup changes, coaching decisions, playoff implications and shifts in team trajectory."]
            }
          />
        </div>

        <div className="rounded-xl bg-neutral-50 p-3">
          <p className="mb-2 text-xs font-black uppercase text-neutral-600">Reporting Angles</p>
          <LineList
            items={
              angles.length
                ? angles
                : ["The strongest stories usually sit beneath the scoreboard: pressure, momentum, roster tension, accountability and what changes next."]
            }
          />
        </div>
      </div>
    </article>
  );
}

export default function Page() {
  const report = readReport();

  let stories = getStories(report).filter(isPublishableStory);

  const liveNewsroomStories = getSpotlightStories(report, "live_newsroom");
  const editorSignalStories = getSpotlightStories(report, "editor_signals");

  const rawSignals = asList(
    report.key_storylines ||
      report.keyStorylines ||
      report.signals ||
      report.toplines ||
      report.takeaways
  );

  const fallbackHeadline = "Global Sports Report: The Stories Behind The Board";

  const headline =
    cleanText(report.headline) && !isBadContent(report.headline)
      ? cleanText(report.headline)
      : fallbackHeadline;

  const defaultSnapshot =
    "A live sports newsroom briefing focused on the stories, injuries, results and league developments shaping the next cycle of coverage.";

  const rawSnapshot = cleanText(report.snapshot);

  const snapshot =
    rawSnapshot &&
    !isBadContent(rawSnapshot) &&
    !/board|signals|signal|coverage priorities|reporting path|verify|organized|market read|takes shape|pressure points/i.test(rawSnapshot)
      ? rawSnapshot
      : defaultSnapshot;

  const updated =
    cleanText(report.updated_at) ||
    cleanText(report.generated_at) ||
    cleanText(report.published_at) ||
    "Update time unavailable";

  if (!stories.length) {
    stories = [
      {
        league: "Sports Watch",
        headline,
        summary: snapshot,
        url: "https://www.espn.com/",
        key_data: ["The current sports cycle centers on playoff races, roster pressure, injuries and league-wide momentum shifts."],
        why_it_matters: ["Every major result, injury or roster decision can quickly reshape standings, expectations and the next wave of coverage."],
        what_to_watch: ["Watch for late-breaking injuries, coaching decisions, lineup changes, postseason pressure and statistical movement."],
        story_angles: ["The biggest stories often emerge from tension, expectations, accountability and what happens after the final score."],
        story_type: "analysis",
      },
    ];
  }

  const leadStories = stories.slice(0, 10);

  const worldCupStories = stories
    .filter((story) => {
      const blob = `${story.headline || ""} ${story.title || ""} ${story.snapshot || ""} ${story.summary || ""} ${story.content || ""}`.toLowerCase();
      return (
        blob.includes("world cup") ||
        blob.includes("fifa") ||
        blob.includes("usmnt") ||
        blob.includes("soccer") ||
        blob.includes("qualifying") ||
        blob.includes("national team")
      );
    })
    .slice(0, 5);

  const liveBriefingItems = liveNewsroomStories.length
    ? spotlightItemsFromStories(liveNewsroomStories)
    : buildBriefingItems(stories, rawSignals);

  const editorSignalItems = editorSignalStories.length
    ? spotlightItemsFromStories(editorSignalStories)
    : cleanSignals(rawSignals.length ? rawSignals : buildBriefingItems(stories.slice(3), []));

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-950">
      <div className="border-b border-neutral-800 bg-black text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-5 py-2 text-xs font-bold uppercase tracking-wide">
          <span className="text-neutral-300">GSR Network:</span>
          {GSR_NETWORK.map(([name, url], index) => (
            <span key={name} className="flex items-center gap-3">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={
                  name === "Sports"
                    ? "text-red-300 hover:text-white"
                    : "text-white hover:text-red-300"
                }
              >
                {name}
              </a>
              {index < GSR_NETWORK.length - 1 ? <span className="text-neutral-500">•</span> : null}
            </span>
          ))}
        </div>
      </div>

      <div className="border-b border-neutral-800 bg-neutral-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-5 py-3 text-xs font-bold uppercase tracking-wide">
          <span className="text-neutral-400">Follow GSR:</span>
          <SocialIconLinks />
        </div>
      </div>

      <header className="border-b border-neutral-300 bg-white">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <p className="text-sm font-black uppercase tracking-wide text-red-700">
              {SITE.name}
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight md:text-5xl">
              {headline}
            </h1>

            <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-700">
              {snapshot}
            </p>

            <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
              <span className="rounded-full bg-black px-4 py-2 text-white">
                {SITE.tagline}
              </span>
              <span className="rounded-full bg-neutral-200 px-4 py-2 text-neutral-800">
                Updated: {updated}
              </span>
            </div>
          </div>

          <NewsroomBriefing
            items={
              liveBriefingItems.length
                ? liveBriefingItems
                : [
                    "The day’s biggest stories are being shaped by injuries, playoff races and rising pressure across multiple leagues.",
                    "Coaching decisions, lineup movement and late-game execution are driving several major storylines.",
                    "Standings swings and performance trends are beginning to reshape postseason expectations.",
                    "League-wide momentum continues to shift as teams respond to injuries, pressure and schedule demands.",
                  ]
            }
          />
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="space-y-6">
          <Block title="World Cup 2026 Coverage">
            <img
              src="/world-cup-2026-soccer.svg"
              alt="World Cup 2026 soccer coverage"
              className="w-full rounded-xl border border-neutral-200 bg-neutral-950"
            />
            <p className="mt-3 text-sm leading-6 text-neutral-700">
              Global Sports Report is tracking World Cup 2026 through match coverage, player trends, team movement, host-city context and the broader soccer storylines building through the tournament.
            </p>

            <div className="mt-4 space-y-3">
              <p className="text-xs font-black uppercase tracking-wide text-neutral-500">Latest World Cup Signals</p>
              {worldCupStories.length ? (
                worldCupStories.map((story, index) => {
                  const title = cleanText(story.headline || story.title || `World Cup update ${index + 1}`);
                  const url = cleanText(story.url || story.source_url || "");
                  const source = cleanText(story.source_label || story.source || "");
                  return (
                    <a
                      key={`${title}-${index}`}
                      href={url || "#"}
                      target={url ? "_blank" : undefined}
                      rel={url ? "noopener noreferrer" : undefined}
                      className="block rounded-lg border border-neutral-200 bg-neutral-50 p-3 hover:bg-white"
                    >
                      <p className="text-sm font-black leading-5 text-neutral-950">{title}</p>
                      {source ? <p className="mt-1 text-xs font-bold uppercase tracking-wide text-neutral-500">{source}</p> : null}
                    </a>
                  );
                })
              ) : (
                <p className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm leading-6 text-neutral-700">
                  World Cup story tracking will update here as soccer headlines enter the Sports report.
                </p>
              )}
            </div>
          </Block>
          <Block title="World Cup 2026 Data Desk">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-neutral-500">Opening Match</p>
                <p className="mt-1 font-black text-neutral-950">June 11, 2026</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-neutral-500">Final</p>
                <p className="mt-1 font-black text-neutral-950">July 19, 2026</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-neutral-500">Teams</p>
                <p className="mt-1 font-black text-neutral-950">48</p>
              </div>
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                <p className="text-xs font-black uppercase tracking-wide text-neutral-500">Matches</p>
                <p className="mt-1 font-black text-neutral-950">104</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-6 text-neutral-700">
              GSR will track the tournament through match results, player form, group movement, host-city pressure, travel demands and the soccer storylines that matter beyond the scoreboard.
            </p>
          </Block>
          <Block title="Editor Signals">
            <LineList
              items={
                editorSignalItems.length
                  ? editorSignalItems
                  : [
                      "Playoff positioning, injuries and coaching pressure are driving today’s strongest sports storylines.",
                      "Several teams are entering critical stretches where lineup decisions and late-game execution matter more.",
                      "Performance trends, roster questions and postseason implications continue shaping coverage priorities.",
                    ]
              }
            />
          </Block>

          <Block title="Journalist Toolkit">
            <LinkList items={TOOLKIT} />
          </Block>

          <Block title="Scoreboard Sites">
            <p className="mb-3 text-sm leading-6 text-neutral-700">
              Scoreboards provide the raw information. GSR focuses on the pressure points, consequences, performance trends and storylines developing behind the results.
            </p>
            <LinkList items={SCOREBOARD_SITES} />
          </Block>

          <AdvertiseWithGsrBlock />




          <Block title="Coverage Lens">
            <LineList
              items={[
                "Pressure often reveals the real story behind the final score.",
                "Playoff races, injuries and roster decisions can quickly shift league momentum.",
                "Coaching choices, late-game execution and performance trends deserve deeper scrutiny.",
                "The strongest sports stories usually involve accountability, expectations and what changes next.",
                "Every major result creates a ripple effect across standings, betting markets and future coverage.",
              ]}
            />
          </Block>
        </aside>

        <section className="space-y-6">
          {leadStories.map((story, index) => (
            <StoryCard key={story.id || index} story={story} index={index} />
          ))}
        </section>
</section>

      <footer className="border-t border-neutral-300 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-6">
          <p className="text-sm font-medium text-neutral-700">
            © {new Date().getFullYear()} {SITE.name}. {SITE.tagline}
          </p>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-neutral-500">
            {SITE.descriptor}
          </p>
        </div>
        <EditorialStandard />
      </footer>
    </main>
  );
}





