import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

import EditorialStandard from "@/components/EditorialStandard";

type AnyObj = Record<string, any>;

const SITE = {
  name: "Global Sports Report",
  tagline: "Built for journalists, by a journalist.",
  topic: "Sports",
  descriptor:
    "Global Sports Report tracks live scores, schedules, advanced metrics, story angles and newsroom-ready sports intelligence across MLB, NBA, NFL, NHL, soccer and the broader sports calendar.",
};

const TOOLKIT = [
  ["ESPN", "https://www.espn.com/"],
  ["The Athletic", "https://www.nytimes.com/athletic/"],
  ["Sports Reference", "https://www.sports-reference.com/"],
  ["Baseball Savant", "https://baseballsavant.mlb.com/"],
  ["Spotrac", "https://www.spotrac.com/"],
];

const BAD_CONTENT_PHRASES = [
  "source refresh",
  "refresh needed",
  "needed before publication",
  "stale",
  "blocked",
  "strict mode",
  "current-day update pending",
  "feed checked",
  "required date",
  "rebuild distribution",
  "bad or stale",
  "not allowed onto the homepage",
  "no verified data point attached yet",
  "no current items available",
];

const WEAK_HEADLINE_PHRASES = [
  "probable",
  "probables",
  "scheduled matchup",
  "matchup available",
  "current-day update pending",
  "source refresh",
  "refresh needed",
];

const RESULT_WORDS = [
  "beat",
  "beats",
  "defeat",
  "defeats",
  "won",
  "wins",
  "final",
  "rally",
  "rallies",
  "shutout",
  "walk-off",
  "walkoff",
  "overtime",
  "clinched",
  "eliminated",
];

const NEWS_WORDS = [
  "breaking",
  "injury",
  "injured",
  "trade",
  "traded",
  "signs",
  "signed",
  "waived",
  "released",
  "suspended",
  "suspension",
  "fired",
  "hired",
  "coach",
  "manager",
  "contract",
  "extension",
  "draft",
  "playoff",
  "returns",
  "ruled out",
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

  return String(value).replace(/\s+/g, " ").trim();
}

function normalizeText(value: any): string {
  return cleanText(value).toLowerCase();
}

function asList(value: any): string[] {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      if (typeof item === "string") {
        return item
          .split(/\n|•|\|/)
          .map((x) => x.trim())
          .filter(Boolean);
      }

      if (item && typeof item === "object") {
        const text =
          cleanText(item.text) ||
          cleanText(item.title) ||
          cleanText(item.headline) ||
          cleanText(item.summary) ||
          cleanText(item.description) ||
          cleanText(item.note) ||
          cleanText(item.angle) ||
          cleanText(item.game) ||
          cleanText(item.matchup);

        return text ? [text] : [];
      }

      return cleanText(item) ? [cleanText(item)] : [];
    });
  }

  if (typeof value === "object") {
    return Object.values(value).map(cleanText).filter(Boolean);
  }

  return cleanText(value)
    .split(/\n|•|\|/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function unique(items: string[]): string[] {
  const seen = new Set<string>();

  return items
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter((item) => {
      if (!item) return false;

      const key = item.toLowerCase();

      if (seen.has(key)) return false;

      seen.add(key);
      return true;
    });
}

function isBadContent(value: any): boolean {
  const text = normalizeText(value);

  if (!text) return true;

  return BAD_CONTENT_PHRASES.some((phrase) => text.includes(phrase));
}

function looksLikeScheduledMatchup(value: any): boolean {
  const text = normalizeText(value);

  if (!text) return false;

  if (text.includes("probable") || text.includes("probables")) return true;
  if (text.includes("scheduled matchup")) return true;
  if (text.includes("matchup available")) return true;

  const hasTime = /\b\d{1,2}:\d{2}\s*(am|pm)?\s*et\b/i.test(text);
  const hasAt = /\s+at\s+/.test(text);
  const hasVs = /\s+vs\.?\s+/.test(text) || /\s+v\.\s+/.test(text);

  return hasTime && (hasAt || hasVs);
}

function isWeakHeadline(value: any): boolean {
  const text = normalizeText(value);

  if (!text) return true;

  if (BAD_CONTENT_PHRASES.some((phrase) => text.includes(phrase))) return true;
  if (WEAK_HEADLINE_PHRASES.some((phrase) => text.includes(phrase))) return true;
  if (looksLikeScheduledMatchup(text)) return true;

  return false;
}

function storyText(story: AnyObj): string {
  return cleanText([
    story.headline,
    story.title,
    story.name,
    story.summary,
    story.snapshot,
    story.description,
    story.league,
    story.story_type,
  ]);
}

function storyTitle(story: AnyObj, index: number): string {
  return (
    cleanText(story.headline) ||
    cleanText(story.title) ||
    cleanText(story.name) ||
    cleanText(story.league) ||
    `Sports Storyline ${index + 1}`
  );
}

function storyUrl(story: AnyObj): string {
  const url = cleanText(story.url) || cleanText(story.link) || cleanText(story.source_url);
  return url.startsWith("http://") || url.startsWith("https://") ? url : "#";
}

function storySummary(story: AnyObj): string {
  return (
    cleanText(story.snapshot) ||
    cleanText(story.summary) ||
    cleanText(story.description) ||
    cleanText(story.body) ||
    "Sports development flagged for newsroom monitoring."
  );
}

function storyLabel(story: AnyObj): string {
  return cleanText(story.league) || cleanText(story.label) || "Sports Watch";
}

function storyType(story: AnyObj): string {
  const explicit = normalizeText(story.story_type);

  if (explicit) return explicit;

  const text = normalizeText(storyText(story));

  if (looksLikeScheduledMatchup(text)) return "schedule";

  if (NEWS_WORDS.some((word) => text.includes(word))) return "news";

  if (RESULT_WORDS.some((word) => text.includes(word))) return "result";

  return "analysis";
}

function isPublishableStory(story: AnyObj): boolean {
  if (!story || typeof story !== "object") return false;

  const title = storyTitle(story, 0);
  const summary = storySummary(story);
  const text = `${title} ${summary} ${storyText(story)}`;

  if (!title) return false;
  if (isBadContent(text)) return false;

  return true;
}

function storyScore(story: AnyObj): number {
  const type = storyType(story);
  const text = normalizeText(storyText(story));
  let score = 0;

  if (type === "news") score += 100;
  else if (type === "result") score += 85;
  else if (type === "analysis") score += 60;
  else if (type === "schedule") score += 10;

  if (NEWS_WORDS.some((word) => text.includes(word))) score += 20;
  if (RESULT_WORDS.some((word) => text.includes(word))) score += 15;

  if (storyUrl(story) !== "#") score += 8;

  if (looksLikeScheduledMatchup(text)) score -= 80;
  if (text.includes("probable") || text.includes("probables")) score -= 80;

  return score;
}

function sortStories(stories: AnyObj[]): AnyObj[] {
  return [...stories].sort((a, b) => {
    const aType = storyType(a);
    const bType = storyType(b);

    const aSchedule = aType === "schedule" ? 1 : 0;
    const bSchedule = bType === "schedule" ? 1 : 0;

    if (aSchedule !== bSchedule) return aSchedule - bSchedule;

    return storyScore(b) - storyScore(a);
  });
}

function getStories(report: AnyObj): AnyObj[] {
  const candidates =
    report.homepage_cards ||
    report.cards ||
    report.stories ||
    report.news ||
    report.headlines ||
    report.items ||
    report.articles ||
    [];

  if (Array.isArray(candidates)) {
    return candidates.filter((story) => story && typeof story === "object");
  }

  if (candidates && typeof candidates === "object") {
    return Object.entries(candidates).map(([key, value]: [string, any]) => {
      if (value && typeof value === "object") {
        return {
          id: key,
          league: value.league || key.toUpperCase(),
          ...value,
        };
      }

      return {
        id: key,
        league: key.toUpperCase(),
        headline: cleanText(value),
      };
    });
  }

  return [];
}

function cleanSignals(items: string[]): string[] {
  return unique(items)
    .filter((item) => !isBadContent(item))
    .filter((item) => !isWeakHeadline(item))
    .slice(0, 6);
}

function pickStrongHeadline(stories: AnyObj[], fallback: string): string {
  const sorted = sortStories(stories);

  for (const story of sorted) {
    const title = storyTitle(story, 0);

    if (!isWeakHeadline(title) && !isBadContent(title)) {
      return title;
    }
  }

  for (const story of sorted) {
    const title = storyTitle(story, 0);

    if (!isBadContent(title)) {
      return title;
    }
  }

  return fallback;
}

function buildBriefingItems(stories: AnyObj[], rawSignals: string[]): string[] {
  const fromStories = sortStories(stories)
    .filter((story) => storyType(story) !== "schedule")
    .map((story) => {
      const label = storyLabel(story);
      const title = storyTitle(story, 0);
      return `${label}: ${title}`;
    });

  return cleanSignals([...fromStories, ...rawSignals]);
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-sm font-black uppercase tracking-wide text-red-700">
        {title}
      </h2>
      {children}
    </section>
  );
}

function LineList({ items }: { items: string[] }) {
  const safe = unique(items)
    .filter((item) => !isBadContent(item))
    .slice(0, 8);

  if (!safe.length) {
    return (
      <p className="text-sm leading-6 text-neutral-700">
        Monitoring verified developments for the next clean newsroom update.
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
            <p
              key={i}
              className="border-b border-neutral-100 pb-2 text-sm leading-6 text-neutral-800"
            >
              {item}
            </p>
          ))}
        </div>
      ) : (
        <p className="text-sm leading-6 text-neutral-700">
          Monitoring verified scores, injuries, playoff movement, roster changes and advanced performance signals.
        </p>
      )}
    </div>
  );
}

function StoryCard({ story, index }: { story: AnyObj; index: number }) {
  const title = storyTitle(story, index);
  const url = storyUrl(story);
  const summary = storySummary(story);
  const label = storyLabel(story);

  const blocks = story.journalist_blocks || {};

  const keyData = asList(
    story.key_data ||
      story.keyData ||
      story.data ||
      story.metrics ||
      story.items ||
      blocks.key_data
  ).filter((item) => !isBadContent(item));

  const why = asList(
    story.why_it_matters ||
      story.whyItMatters ||
      story.why ||
      blocks.why_it_matters
  ).filter((item) => !isBadContent(item));

  const watch = asList(
    story.what_to_watch ||
      story.whatToWatch ||
      story.watch ||
      blocks.what_to_watch ||
      story.story_angles ||
      blocks.story_angles
  ).filter((item) => !isBadContent(item));

  return (
    <article className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <p className="mb-2 text-xs font-black uppercase tracking-wide text-red-700">
        {label}
      </p>

      <h3 className="text-xl font-black leading-tight text-neutral-950">
        {url !== "#" ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="hover:text-red-700">
            {title}
          </a>
        ) : (
          title
        )}
      </h3>

      <p className="mt-3 text-sm leading-6 text-neutral-700">{summary}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-neutral-50 p-3">
          <p className="mb-2 text-xs font-black uppercase text-neutral-600">Key Data</p>
          <LineList items={keyData.length ? keyData : [title]} />
        </div>

        <div className="rounded-xl bg-neutral-50 p-3">
          <p className="mb-2 text-xs font-black uppercase text-neutral-600">Why It Matters</p>
          <LineList
            items={
              why.length
                ? why
                : ["This development can affect coverage priorities, follow-up angles or newsroom planning."]
            }
          />
        </div>

        <div className="rounded-xl bg-neutral-50 p-3">
          <p className="mb-2 text-xs font-black uppercase text-neutral-600">What To Watch</p>
          <LineList
            items={
              watch.length
                ? watch
                : ["Monitor confirmed reporting, next-game context, injury updates, standings movement or metric shifts."]
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
  stories = sortStories(stories);

  const rawSignals = asList(
    report.key_storylines ||
      report.keyStorylines ||
      report.signals ||
      report.toplines ||
      report.takeaways
  );

  const fallbackHeadline =
    "Global Sports Report: Live Sports Newsroom Board";

  const headline = pickStrongHeadline(stories, fallbackHeadline);

  const snapshot =
    cleanText(report.snapshot) && !isBadContent(report.snapshot)
      ? cleanText(report.snapshot)
      : "A live sports briefing built for journalists tracking verified scores, results, analytics, playoff races, injuries and story angles.";

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
        key_data: ["Latest sports report generated from the current verified newsroom board."],
        why_it_matters: ["Editors need fast clarity across scores, results, analytics and live story movement."],
        what_to_watch: ["Next verified result, injury note, roster move, playoff angle or advanced metric signal."],
        story_type: "analysis",
      },
    ];
  }

  const leadStories = stories.slice(0, 10);
  const briefingItems = buildBriefingItems(stories, rawSignals);

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-950">
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
              briefingItems.length
                ? briefingItems
                : [
                    "Track the strongest verified sports development on today’s board.",
                    "Prioritize results, injuries, playoff movement, roster news and verified links.",
                    "Watch advanced metrics, standings shifts and late-breaking league updates.",
                    "Monitor league-by-league angles for reporters and editors.",
                  ]
            }
          />
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-6 px-5 py-6 lg:grid-cols-[0.75fr_1.25fr]">
        <aside className="space-y-6">
          <Block title="Editor Signals">
            <LineList
              items={
                briefingItems.length
                  ? briefingItems
                  : [
                      "Track the strongest verified sports development on today’s board.",
                      "Prioritize results, injuries, playoff movement, roster news and verified links.",
                      "Watch advanced metrics, standings shifts and late-breaking league updates.",
                    ]
              }
            />
          </Block>

          <Block title="Journalist Toolkit">
            <div className="space-y-2">
              {TOOLKIT.map(([name, url]) => (
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
          </Block>

          <Block title="Coverage Lens">
            <LineList
              items={[
                "Scoreboard: What result changes the day’s sports conversation?",
                "News: What injury, roster, playoff or league development needs follow-up?",
                "Performance: Which player or team metric deserves deeper reporting?",
                "Context: What standings, playoff or roster angle matters most?",
                "Newsroom: What should journalists verify next?",
              ]}
            />
          </Block>
        </aside>

        <section className="space-y-6">
          {leadStories.map((story, index) => (
            <StoryCard key={index} story={story} index={index} />
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