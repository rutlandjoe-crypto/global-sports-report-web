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
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean).join(" • ");
  if (typeof value === "object") {
    return Object.values(value).map(cleanText).filter(Boolean).join(" • ");
  }
  return String(value).replace(/\s+/g, " ").trim();
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

  if (typeof value === "object") return Object.values(value).map(cleanText).filter(Boolean);

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

function getStories(report: AnyObj): AnyObj[] {
  const candidates =
    report.homepage_cards ||
    report.cards ||
    report.stories ||
    report.news ||
    report.headlines ||
    report.items ||
    report.articles ||
    report.sections ||
    [];

  if (Array.isArray(candidates)) return candidates.filter(Boolean);

  if (typeof candidates === "object") {
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
  return cleanText(story.url) || cleanText(story.link) || cleanText(story.source_url) || "#";
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
  const safe = unique(items).slice(0, 8);

  if (!safe.length) {
    return <p className="text-sm leading-6 text-neutral-700">No current items available.</p>;
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
  const safe = unique(items).slice(0, 6);

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
          Monitoring scores, schedules, injuries, playoff races, betting movement and advanced performance signals.
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
  );

  const why = asList(
    story.why_it_matters ||
      story.whyItMatters ||
      story.why ||
      blocks.why_it_matters
  );

  const watch = asList(
    story.what_to_watch ||
      story.whatToWatch ||
      story.watch ||
      blocks.what_to_watch ||
      story.story_angles ||
      blocks.story_angles
  );

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
          <LineList items={keyData.length ? keyData : ["No verified data point attached yet."]} />
        </div>

        <div className="rounded-xl bg-neutral-50 p-3">
          <p className="mb-2 text-xs font-black uppercase text-neutral-600">Why It Matters</p>
          <LineList items={why.length ? why : ["This affects sports coverage priorities."]} />
        </div>

        <div className="rounded-xl bg-neutral-50 p-3">
          <p className="mb-2 text-xs font-black uppercase text-neutral-600">What To Watch</p>
          <LineList items={watch.length ? watch : ["Monitor the next score, matchup, injury note, metric shift or roster development."]} />
        </div>
      </div>
    </article>
  );
}

export default function Page() {
  const report = readReport();

  const headline =
    cleanText(report.headline) ||
    cleanText(report.title) ||
    "Sports Newsroom Watch: Today’s Board Under Review";

  const snapshot =
    cleanText(report.snapshot) ||
    cleanText(report.summary) ||
    cleanText(report.body) ||
    "A live sports briefing built for journalists tracking scores, schedules, analytics, playoff races and story angles.";

  const updated =
    cleanText(report.updated_at) ||
    cleanText(report.generated_at) ||
    cleanText(report.published_at) ||
    "Update time unavailable";

  let stories = getStories(report).filter((story) => story && typeof story === "object");

  if (!stories.length) {
    stories = [
      {
        headline,
        summary: snapshot,
        key_data: ["Latest sports report generated from the current board."],
        why_it_matters: ["Editors need fast clarity across scores, schedules and live story movement."],
        what_to_watch: ["Next result, matchup shift, injury note, playoff angle or advanced metric signal."],
      },
    ];
  }

  const leadStories = stories.slice(0, 10);

  const signals = asList(
    report.key_storylines ||
      report.keyStorylines ||
      report.signals ||
      report.toplines ||
      report.takeaways
  );

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
              signals.length
                ? signals
                : [
                    "Track the strongest sports development on today’s board.",
                    "Prioritize scores, schedules, matchup context and verified links.",
                    "Watch advanced metrics, playoff movement, injuries and betting-market signals.",
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
                signals.length
                  ? signals
                  : [
                      "Track the strongest sports development on today’s board.",
                      "Prioritize verified scores, schedules and story angles.",
                      "Watch injuries, playoff races, roster movement and advanced performance signals.",
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
                "Matchup: Which game creates the clearest reporter angle?",
                "Performance: Which player or team metric deserves follow-up?",
                "Context: What standings, playoff or roster angle matters?",
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