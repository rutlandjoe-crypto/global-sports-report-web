import fs from "fs";
import path from "path";
import Link from "next/link";
import EditorialStandard from "@/components/EditorialStandard";
import { readSportsDeskPayload } from "@/lib/sportsDesks";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import SocialIconLinks from "@/app/SocialIconLinks";

type AnyObj = ReturnType<typeof JSON.parse>;

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

const SPORTS_DESKS = [
  ["NFL", "/nfl"],
  ["College Football", "/college-football"],
  ["MLB", "/mlb"],
  ["Soccer / Football", "/soccer"],
  ["Fantasy Sports", "/fantasy"],
  ["WNBA", "/wnba"],
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

function cleanText(value: AnyObj): string {
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

function normalizeText(value: AnyObj): string {
  return cleanText(value).toLowerCase();
}

function isInternalReportLabel(value: AnyObj): boolean {
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

function publicText(value: AnyObj): string {
  const text = cleanText(value);
  return isInternalReportLabel(text) ? "" : text;
}

function isBadContent(value: AnyObj): boolean {
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

function asList(value: AnyObj): string[] {
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

function isValidUrl(value: AnyObj): boolean {
  const url = cleanText(value);
  return url.startsWith("http://") || url.startsWith("https://");
}

function findUrlInText(value: AnyObj): string {
  const text = cleanText(value);
  const match = text.match(/https?:\/\/[^\s"'<>]+/);
  return match ? match[0].replace(/[),.;]+$/, "") : "";
}

function extractBestUrl(section: AnyObj): string {
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

  return "";
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
    url: extractBestUrl(section),
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
  const url = extractBestUrl(story);

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
        .map(([key, value]: [string, AnyObj], index) => {
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
    return Object.entries(report.sections).map(([key, value]: [string, AnyObj]) =>
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
  return isValidUrl(url) ? url : "";
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
  if (!isValidUrl(storyUrl(story))) return false;

  return true;
}

function getProFootballStories(report: AnyObj): AnyObj[] {
  const candidates = [report.homepage_cards, report.stories]
    .filter(Array.isArray)
    .flat()
    .filter((story) => story && typeof story === "object")
    .filter((story) => normalizeText(story.league || story.label || story.category) === "nfl")
    .filter((story) => {
      const headline = normalizeText(story.source_headline || story.original_headline);
      const url = cleanText(story.url || story.source_url || story.link);

      if (!headline || !isValidUrl(url)) return false;

      return (
        !/\b(schedule hub|news board updates|fantasy|college football|soccer|preview)\b/.test(headline) &&
        !/^(ranking|best)\b/.test(headline) &&
        !/\b(matchmaker|landing spots)\b/.test(headline) &&
        !/\/(college-football|soccer|nba)\//.test(url) &&
        !/^https?:\/\/(www\.)?espn\.com\/nfl\/?$/.test(url)
      );
    })
    .sort((a, b) => {
      const rank = (story: AnyObj) => {
        const headline = normalizeText(story.source_headline || story.original_headline);

        if (/\b(sign(?:s|ed|ing)?|trad(?:e|es|ed|ing)|releas(?:e|es|ed|ing)|waiv\w*|extension|holdout|injur\w*)\b/.test(headline)) return 5;
        if (/\b(training camp|roster|rookie|coach\w*|front office)\b/.test(headline)) return 4;
        if (/\b(beat|defeat\w*|win|won|final|standings|playoff\w*|preseason)\b/.test(headline)) return 3;
        return 2;
      };

      return rank(b) - rank(a) || Number(b.priority_score || 0) - Number(a.priority_score || 0);
    });

  const selected: AnyObj[] = [];
  const seenHeadlines = new Set<string>();
  const seenUrls = new Set<string>();
  const eventWords = (story: AnyObj) =>
    new Set(
      normalizeText(story.source_headline || story.original_headline)
        .split(/[^a-z0-9]+/)
        .filter(
          (word) =>
            word.length > 4 &&
            !["football", "league", "after", "their", "against", "could", "would", "season", "report"].includes(word)
        )
    );

  for (const story of candidates) {
    const headline = cleanText(story.source_headline || story.original_headline);
    const headlineKey = headline.toLowerCase();
    const url = cleanText(story.url || story.source_url || story.link);

    if (seenHeadlines.has(headlineKey) || seenUrls.has(url)) continue;

    const words = eventWords(story);
    const repeatsEvent = selected.some((existing) => {
      const sharedWords = [...words].filter((word) => eventWords(existing).has(word));
      return sharedWords.length >= 3;
    });

    if (repeatsEvent) continue;

    selected.push({ ...story, display_headline: headline, display_url: url });
    seenHeadlines.add(headlineKey);
    seenUrls.add(url);

    if (selected.length === 6) break;
  }

  return selected;
}

function getCollegeFootballStories(report: AnyObj): AnyObj[] {
  const collegeFootballTags = new Set(["ncaaf", "ncaafb", "cfb", "college football", "ncaa football"]);
  const explicitFootballSignals =
    /\b(college football|ncaa football|ncaaf|ncaafb|cfb|college football playoff|ap top 25|coaches poll|heisman|bowl game|bowl games|transfer portal|national signing day|football recruiting|football season|football team|football program)\b/;
  const broadCollegeSignals = /\b(power four|sec|big ten|big 12|acc)\b/;
  const footballContext =
    /\b(football|cfp|playoff|bowl|heisman|quarterback|qb|touchdown|gridiron|recruiting|signing day|transfer portal|depth chart|training camp|preseason practice)\b/;
  const unrelatedSports =
    /\b(nfl|super bowl|nba|wnba|mlb|nhl|soccer|premier league|champions league|basketball|baseball|softball|hockey|lacrosse|volleyball|golf|tennis)\b/;
  const lowQuality =
    /\b(schedule hub|schedule page|scores page|rankings hub|recruiting database|team roster|roster directory|fantasy football|preview guide|futures market|betting odds)\b/;

  const candidates = [report.homepage_cards, report.stories]
    .filter(Array.isArray)
    .flat()
    .filter((story) => story && typeof story === "object")
    .filter((story) => {
      const tag = normalizeText(story.league || story.label || story.category);
      const headline = normalizeText(story.source_headline || story.original_headline);
      const url = cleanText(story.url || story.source_url || story.link);
      const hasCollegeFootballTag = collegeFootballTags.has(tag);
      const hasHeadlineSignal = explicitFootballSignals.test(headline);
      const hasQualifiedConferenceSignal = broadCollegeSignals.test(headline) && footballContext.test(headline);

      if (!headline || !isValidUrl(url)) return false;
      if (!hasCollegeFootballTag && !hasHeadlineSignal && !hasQualifiedConferenceSignal) return false;
      if (unrelatedSports.test(headline) || lowQuality.test(headline)) return false;
      if (/\/(nfl|soccer|nba|mens-college-basketball|womens-college-basketball|mlb|nhl)\//.test(url)) return false;
      if (/\/(odds|futures)(?:\/|$)/.test(url)) return false;

      return true;
    })
    .sort((a, b) => {
      const rank = (story: AnyObj) => {
        const headline = normalizeText(story.source_headline || story.original_headline);

        if (/\b(breaking|fired|hires?|resigns?|dies?|suspended|investigation)\b/.test(headline)) return 8;
        if (/\b(college football playoff|cfp|national championship|semifinal)\b/.test(headline)) return 7;
        if (/\b(ap top 25|coaches poll|rankings?)\b/.test(headline)) return 6;
        if (/\b(final score|upset|conference championship|standings|playoff implications?|beat|defeat\w*|wins?|won)\b/.test(headline)) return 5;
        if (/\b(injur\w*|transfer portal|transfers?|recruit\w*|signing day|coach\w*|coordinator)\b/.test(headline)) return 4;
        if (/\b(training camp|preseason practice|depth chart|quarterback competition|position battle)\b/.test(headline)) return 3;
        if (/\bheisman\b/.test(headline)) return 2;
        return 1;
      };

      return rank(b) - rank(a) || Number(b.priority_score || 0) - Number(a.priority_score || 0);
    });

  const selected: AnyObj[] = [];
  const seenHeadlines = new Set<string>();
  const seenUrls = new Set<string>();
  const eventWords = (story: AnyObj) =>
    new Set(
      normalizeText(story.source_headline || story.original_headline)
        .split(/[^a-z0-9]+/)
        .filter(
          (word) =>
            word.length > 4 &&
            !["college", "football", "after", "their", "against", "season", "report", "latest", "today"].includes(word)
        )
    );

  for (const story of candidates) {
    const headline = cleanText(story.source_headline || story.original_headline);
    const headlineKey = headline.toLowerCase();
    const url = cleanText(story.url || story.source_url || story.link);

    if (seenHeadlines.has(headlineKey) || seenUrls.has(url)) continue;

    const words = eventWords(story);
    const repeatsEvent = selected.some((existing) => {
      const sharedWords = [...words].filter((word) => eventWords(existing).has(word));
      return sharedWords.length >= 3;
    });

    if (repeatsEvent) continue;

    selected.push({ ...story, display_headline: headline, display_url: url });
    seenHeadlines.add(headlineKey);
    seenUrls.add(url);

    if (selected.length === 6) break;
  }

  return selected;
}

function getSoccerStories(report: AnyObj): AnyObj[] {
  const candidates = [report.homepage_cards, report.stories]
    .filter(Array.isArray)
    .flat()
    .filter((story) => story && typeof story === "object")
    .filter((story) => normalizeText(story.league || story.label || story.category) === "soccer")
    .filter((story) => {
      const headline = normalizeText(story.source_headline || story.original_headline || story.headline);
      const url = cleanText(story.url || story.source_url || story.link);

      if (!headline || !isValidUrl(url)) return false;

      return (
        !/\b(schedule|scores page|futures market|odds|tifo|preview guide)\b/.test(headline) &&
        !/\b(mlb|nba|nfl|nhl|golf)\b/.test(headline) &&
        !/\/golf\//.test(url)
      );
    })
    .sort((a, b) => {
      const rank = (story: AnyObj) => {
        const headline = normalizeText(story.source_headline || story.original_headline || story.headline);

        if (/\b(beat|defeat|win|won|advance|eliminat|exit|final)\b/.test(headline)) return 5;
        if (/\b(sign|transfer|injur|manager|coach|standings|title)\b/.test(headline)) return 4;
        if (/\b(face|play|ruling|ban|suspend|reject)\b/.test(headline)) return 3;
        return 2;
      };

      return rank(b) - rank(a) || Number(b.priority_score || 0) - Number(a.priority_score || 0);
    });

  const selected: AnyObj[] = [];
  const seenHeadlines = new Set<string>();
  const seenUrls = new Set<string>();
  const eventKey = (story: AnyObj) => {
    const text = normalizeText(
      `${story.source_headline || story.original_headline || story.headline || ""} ${story.snapshot || story.summary || ""}`
    );

    if (text.includes("balogun") && /red card|ban|ruling|reversal|suspend|belgium|letting .* off|review/.test(text)) {
      return "balogun-discipline";
    }

    if (text.includes("england") && text.includes("mexico")) return "england-mexico";

    return "";
  };
  const eventWords = (story: AnyObj) =>
    new Set(
      normalizeText(story.source_headline || story.original_headline || story.headline)
        .split(/[^a-z0-9]+/)
        .filter(
          (word) =>
            word.length > 4 &&
            ![
              "soccer",
              "world",
              "match",
              "after",
              "their",
              "against",
              "latest",
              "report",
              "useful",
              "story",
              "rumor",
              "change",
              "squad",
              "balance",
              "structure",
              "minutes",
              "pathways",
              "competitive",
              "pressure",
            ].includes(word)
        )
    );

  for (const story of candidates) {
    const headline = cleanText(story.source_headline || story.original_headline || story.headline);
    const headlineKey = headline.toLowerCase();
    const url = cleanText(story.url || story.source_url || story.link);

    if (seenHeadlines.has(headlineKey) || seenUrls.has(url)) continue;

    const words = eventWords(story);
    const repeatsEvent = selected.some((existing) => {
      if (eventKey(story) && eventKey(story) === eventKey(existing)) return true;

      const sharedWords = [...words].filter((word) => eventWords(existing).has(word));
      return sharedWords.length >= 2;
    });

    if (repeatsEvent) continue;

    selected.push({ ...story, display_headline: headline, display_url: url });
    seenHeadlines.add(headlineKey);
    seenUrls.add(url);

    if (selected.length === 6) break;
  }

  return selected;
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

function EditorsBookshelf() {
  const books = [
    ["Moneyball", "Michael Lewis"],
    ["The Boys of Summer", "Roger Kahn"],
    ["Lords of the Realm", "John Helyar"],
  ];

  return (
    <Block title="Editor's Bookshelf">
      <div className="space-y-2">
        {books.map(([title, author]) => (
          // TODO: Replace this Amazon search URL with the final Amazon Associates URL.
          <a
            key={title}
            href={`https://www.amazon.com/s?k=${encodeURIComponent(`${title} ${author}`)}&tag=gsrsports-20`}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="block rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 hover:bg-red-50"
          >
            <span className="block text-sm font-bold text-red-800">{title}</span>
            <span className="mt-1 block text-xs text-neutral-600">{author}</span>
          </a>
        ))}
      </div>
      <p className="mt-3 text-xs leading-5 text-neutral-500">
        As an Amazon Associate, GSR Network earns from qualifying purchases.
      </p>
    </Block>
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

function fallbackEditorialContext(story: AnyObj, title: string, label: string) {
  const text = normalizeText(`${title} ${storySummary(story)}`);
  const teams = asList(story.teams).slice(0, 2);
  const players = asList(story.players).slice(0, 2);
  const subject = [...players, ...teams][0] || label;

  if (/injur|surgery|questionable|disabled list|\bil\b|\bpup\b|out for/.test(text)) {
    return {
      why: `${subject}'s verified status can affect availability, lineup roles and the options available to the team.`,
      watch: `Watch the original source and official team updates for confirmed timing, participation and any resulting role changes.`,
      angle: `Report the confirmed status first, then assess roster and competition impact without projecting beyond the available update.`,
    };
  }
  if (/trade|traded|signing|signed|waived|released|contract|transfer/.test(text)) {
    return {
      why: `The ${subject} move can change roster roles, depth and the decisions surrounding the next competition window.`,
      watch: `Watch for official transaction terms, corresponding roster moves and clearly sourced role information.`,
      angle: `Separate confirmed transaction details from speculation about usage, fit or future moves.`,
    };
  }
  if (/playoff|postseason|pennant|standings|table|seed|title race|wild card/.test(text)) {
    return {
      why: `The development carries race or table implications within the competition identified by the source.`,
      watch: `Watch the next verified result and updated standings before drawing a broader postseason or title-race conclusion.`,
      angle: `Connect the result to the published race context while keeping projections distinct from current standings.`,
    };
  }
  if (/fantasy|waiver|start.?sit|draft|rankings|lineup/.test(text)) {
    return {
      why: `The report may change fantasy value through role, availability, ranking or roster-management context documented by the source.`,
      watch: `Watch for confirmed usage, injury status, depth-chart movement and updated expert rankings before changing a lineup or roster.`,
      angle: `Tie recommendations to the cited role and format; avoid turning a projection into a reported outcome.`,
    };
  }
  return {
    why: `The verified ${label.toLowerCase()} development adds current context to the next decision, matchup or league storyline.`,
    watch: `Watch the cited source for the next confirmed development and any clearly documented competitive consequence.`,
    angle: `Lead with what the source confirms, then distinguish analysis from facts that remain unsettled.`,
  };
}

function StoryCard({ story, index }: { story: AnyObj; index: number }) {
  const title = storyTitle(story, index);
  const url = storyUrl(story);
  const summary = storySummary(story);
  const label = storyLabel(story);
  const source = publicText(story.source_label || story.publisher || story.source || "Original source");
  const fallback = fallbackEditorialContext(story, title, label);

  const keyData = asList(story.key_data || story.keyData || story.data || story.metrics);
  const why = asList(story.why_it_matters || story.whyItMatters || story.why);
  const watch = asList(story.what_to_watch || story.whatToWatch || story.watch);
  const angles = asList(story.story_angles || story.storyAngles || story.angles);

  return (
    <article className="group relative rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm focus-within:ring-2 focus-within:ring-red-700 focus-within:ring-offset-2">
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-red-700">
        {label}
      </p>

      <h3 className="text-xl font-black leading-tight text-neutral-950 group-hover:text-red-700 group-hover:underline">
        <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${title} from ${source} (opens in a new tab)`} className="after:absolute after:inset-0 focus:outline-none">
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
          <LineList items={why.length ? why : [fallback.why]} />
        </div>

        <div className="rounded-xl bg-neutral-50 p-3">
          <p className="mb-2 text-xs font-black uppercase text-neutral-600">Next Read</p>
          <LineList items={watch.length ? watch : [fallback.watch]} />
        </div>

        <div className="rounded-xl bg-neutral-50 p-3">
          <p className="mb-2 text-xs font-black uppercase text-neutral-600">Reporting Angles</p>
          <LineList items={angles.length ? angles : [fallback.angle]} />
        </div>
      </div>

      <a href={url} target="_blank" rel="noopener noreferrer" className="relative z-10 mt-4 inline-flex text-sm font-black text-red-700 underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700">
        Read original source{source ? ` · ${source}` : ""} <span aria-hidden="true">↗</span>
      </a>
    </article>
  );
}
export default function Page() {
  const report = readReport();
  const deskPayload = readSportsDeskPayload();
  const homepageEditorial = deskPayload.homepage;
  const homepageHero = homepageEditorial?.hero;
  const generatedStories = (homepageEditorial?.stories ?? [])
    .map((story, index) => normalizeStory({
      ...story,
      label: deskPayload.desks?.[story.desk ?? ""]?.label ?? story.desk ?? "Sports Watch",
      league: deskPayload.desks?.[story.desk ?? ""]?.label ?? story.desk ?? "Sports Watch",
      headline: story.title,
      source_label: story.publisher,
    }, index))
    .filter(isPublishableStory);
  const reportStories = getStories(report).filter(isPublishableStory);
  const seenStoryUrls = new Set<string>();
  const stories = [...generatedStories, ...reportStories].filter((story) => {
    const url = storyUrl(story);
    if (!url || seenStoryUrls.has(url)) return false;
    seenStoryUrls.add(url);
    return true;
  });

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
    publicText(homepageHero?.title) ||
    (cleanText(report.headline) && !isBadContent(report.headline)
      ? cleanText(report.headline)
      : fallbackHeadline);
  const heroUrl = isValidUrl(homepageHero?.url) ? cleanText(homepageHero?.url) : "";
  const heroSource = publicText(homepageHero?.publisher);

  const defaultSnapshot =
    "A live sports newsroom briefing focused on the stories, injuries, results and league developments shaping the next cycle of coverage.";

  const rawSnapshot = cleanText(homepageHero?.summary || report.snapshot);
  const snapshot =
    rawSnapshot &&
    !isBadContent(rawSnapshot) &&
    !/board|signals|signal|coverage priorities|reporting path|verify|organized|market read|takes shape|pressure points/i.test(rawSnapshot)
      ? rawSnapshot
      : defaultSnapshot;

  const updated =
    cleanText(homepageEditorial?.updated_at) ||
    cleanText(report.updated_at) ||
    cleanText(report.generated_at) ||
    cleanText(report.published_at) ||
    "Update time unavailable";

  const leadStories = stories.slice(0, 10);
  const sidebarStories = (deskId: string) => (deskPayload.desks?.[deskId]?.stories ?? [])
    .filter((story) => isValidUrl(story.url))
    .slice(0, 6)
    .map((story) => ({
      ...story,
      display_headline: story.title,
      display_url: story.url,
      source_label: story.publisher,
    }));
  const nflSidebarStories = sidebarStories("nfl");
  const collegeSidebarStories = sidebarStories("college-football");
  const soccerSidebarStories = sidebarStories("soccer");
  const proFootballStories = nflSidebarStories.length ? nflSidebarStories : getProFootballStories(report);
  const collegeFootballStories = collegeSidebarStories.length ? collegeSidebarStories : getCollegeFootballStories(report);
  const soccerStories = soccerSidebarStories.length ? soccerSidebarStories : getSoccerStories(report);
  const liveBriefingItems = generatedStories.length
    ? buildBriefingItems(generatedStories, [])
    : liveNewsroomStories.length
      ? spotlightItemsFromStories(liveNewsroomStories)
      : buildBriefingItems(stories, rawSignals);

  const editorSignalItems = generatedStories.length
    ? buildBriefingItems(generatedStories.slice(3), [])
    : editorSignalStories.length
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
              {heroUrl ? (
                <a href={heroUrl} target="_blank" rel="noopener noreferrer" className="hover:text-red-700 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700" aria-label={`${headline} from ${heroSource || "the original source"} (opens in a new tab)`}>
                  {headline}
                </a>
              ) : headline}
            </h1>

            <p className="mt-4 max-w-3xl text-lg leading-8 text-neutral-700">
              {snapshot}
            </p>
            {heroUrl ? <a href={heroUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex text-sm font-black text-red-700 underline underline-offset-4 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700">Read original source{heroSource ? ` · ${heroSource}` : ""} <span aria-hidden="true">↗</span></a> : null}
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

      <nav aria-label="Sports Desks" className="border-b border-neutral-300 bg-neutral-950 text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3 text-sm font-bold">
          <span className="text-neutral-400">Sports Desks:</span>
          {SPORTS_DESKS.map(([label, href]) => (
            <Link key={href} href={href} className="hover:text-red-300 hover:underline">{label}</Link>
          ))}
        </div>
      </nav>

      <EditorialStandard />

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="space-y-6">
          <section className="rounded-2xl border border-blue-700 bg-gradient-to-br from-slate-950 via-blue-950 to-blue-900 p-5 text-white shadow-lg">
            <span className="inline-flex rounded-full bg-blue-500 px-3 py-1 text-xs font-black uppercase tracking-widest text-white">
              NEW
            </span>

            <h2 className="mt-4 text-2xl font-black tracking-tight">NFL Desk</h2>

            <p className="mt-3 text-sm leading-6 text-blue-100">
              Training camp, injuries, transactions, quarterback battles, roster movement, and breaking league news.
            </p>

            <ul className="mt-5 space-y-2 text-sm font-semibold text-white">
              <li>• Training Camp Report</li>
              <li>• Injury Tracker</li>
              <li>• Transactions</li>
              <li>• Quarterback Battles</li>
              <li>• League Headlines</li>
            </ul>

<Link
  href="/nfl"
  className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-white px-4 py-3 text-sm font-black transition hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-blue-950 sm:w-auto"
  style={{ color: "#172554" }}
>
  <span>View Full NFL Desk →</span>
</Link>

          </section>

          <Block title="Global Pro Football Report">
            <div className="space-y-3">
              {proFootballStories.length ? (
                proFootballStories.map((story) => {
                  const title = story.display_headline;
                  const url = story.display_url;
                  const source = cleanText(story.source_label || story.source || "");
                  return (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-neutral-200 bg-neutral-50 p-3 hover:bg-white"
                    >
                      <p className="text-sm font-black leading-5 text-neutral-950">{title}</p>
                      {source ? <p className="mt-1 text-xs font-bold uppercase tracking-wide text-neutral-500">{source}</p> : null}
                    </a>
                  );
                })
              ) : (
                <p className="text-sm leading-6 text-neutral-700">No current pro football headlines available.</p>
              )}
            </div>
          </Block>
          <Block title="Global College Football Report">
            <div className="space-y-3">
              {collegeFootballStories.length ? (
                collegeFootballStories.map((story) => {
                  const title = story.display_headline;
                  const url = story.display_url;
                  const source = cleanText(story.source_label || story.source || "");
                  return (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-neutral-200 bg-neutral-50 p-3 hover:bg-white"
                    >
                      <p className="text-sm font-black leading-5 text-neutral-950">{title}</p>
                      {source ? <p className="mt-1 text-xs font-bold uppercase tracking-wide text-neutral-500">{source}</p> : null}
                    </a>
                  );
                })
              ) : (
                <p className="text-sm leading-6 text-neutral-700">No current college football headlines available.</p>
              )}
            </div>
          </Block>
          <Block title="Global Soccer Report">
            <div className="space-y-3">
              {soccerStories.length ? (
                soccerStories.map((story) => {
                  const title = story.display_headline;
                  const url = story.display_url;
                  const source = cleanText(story.source_label || story.source || "");
                  return (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-lg border border-neutral-200 bg-neutral-50 p-3 hover:bg-white"
                    >
                      <p className="text-sm font-black leading-5 text-neutral-950">{title}</p>
                      {source ? <p className="mt-1 text-xs font-bold uppercase tracking-wide text-neutral-500">{source}</p> : null}
                    </a>
                  );
                })
              ) : (
                <p className="text-sm leading-6 text-neutral-700">No current soccer headlines available.</p>
              )}
            </div>
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

          <EditorsBookshelf />

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
        <StoryCard
              key={`${story.id || story.key || story.league || "story"}-${index}`}
              story={story}
              index={index}
  />
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
      </footer>
    </main>
  );
}





