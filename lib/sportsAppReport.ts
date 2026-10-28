type Item = Record<string, unknown>;
type FreshnessGuard = (item: Item, nowMs: number) => boolean;

function object(value: unknown): Item {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Item : {};
}

function items(value: unknown): Item[] {
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object" && !Array.isArray(item)) : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function newsScore(story: Item, nowMs: number): number {
  const title = text(story.title).toLowerCase();
  const age = (nowMs - Date.parse(text(story.published_at))) / 3600000;
  let score = Number.isFinite(age) && age >= -0.25 && age <= 6 ? Math.max(0, 6 - age) : -500;
  if (age >= -0.25 && age <= 6) {
    const description = `${title} ${text(story.summary).toLowerCase()}`;
    if (/\b(?:dies|died|death|dead|passed away|mourns?|mourning)\b/.test(description)) score += 1000;
    if (/\b(?:playoffs?|postseason|nlcs|alcs|world series|championship)\b/.test(description)) score += 180;
    if (/\b(?:ruled out|surgery|injury|injured|trade|traded|fired|hired)\b/.test(title)) score += 120;
    if (story.desk === "nfl") score += 80;
    else if (story.desk === "college-football") score += 70;
  }
  if (/\b(?:season in review|season review|year in review|retrospective|offseason review)\b/.test(title)) score -= 2000;
  return score;
}

/** Only adapt the app response. The website's desks and report files stay intact. */
export function sportsAppReport(value: unknown, isFresh: FreshnessGuard, nowMs = Date.now()) {
  const payload = object(value);
  const homepage = object(payload.homepage);
  const desks = object(payload.desks);
  const candidates: Item[] = [
    ...Object.entries(desks).flatMap(([deskId, raw]) => items(object(raw).stories).map((story) => ({ ...story, desk: text(story.desk) || deskId }))),
    ...items(homepage.stories),
    ...items([homepage.hero]),
  ];
  const seenUrls = new Set<string>();
  const seenTitles = new Set<string>();
  const stories = candidates.filter((story) => {
    const title = text(story.title);
    const summary = text(story.summary);
    if (!title || !isFresh(story, nowMs)) return false;
    if (text(story.id).startsWith("score:") || /^verified .+ (?:final|live) score/i.test(summary)) return false;
    if (/\b(?:source refresh|refresh needed|strict mode|current-day update pending|no current items available|undefined)\b/i.test(`${title} ${summary}`)) return false;
    try {
      const url = new URL(text(story.url));
      if (!["http:", "https:"].includes(url.protocol)) return false;
      if (/\/(?:scoreboard|scores|schedule)\/?$/i.test(url.pathname)) return false;
    } catch { return false; }
    return true;
  }).sort((a, b) => newsScore(b, nowMs) - newsScore(a, nowMs)).filter((story) => {
    const identity = (text(story.canonical_url) || text(story.url)).toLowerCase().replace(/^https?:\/\/(?:www\.)?/, "").replace(/[?#].*$/, "").replace(/\/+$/, "");
    const title = text(story.title).toLowerCase();
    if (seenUrls.has(identity) || seenTitles.has(title)) return false;
    seenUrls.add(identity); seenTitles.add(title);
    return true;
  }).slice(0, 40).map((story) => {
    const desk = text(story.desk);
    const label = text(object(desks[desk]).label) || desk || "Sports";
    const published = text(story.published_at);
    const age = (nowMs - Date.parse(published)) / 3600000;
    return {
      headline: text(story.title), snapshot: text(story.summary), url: text(story.url),
      source_name: text(story.publisher), published,
      age_hours: Number.isFinite(age) ? Math.max(0, age).toFixed(2) : "",
      key_data: [`Topic: ${label}`], why_it_matters: [], what_to_watch: [],
    };
  });
  return {
    site: "Global Sports Report", vertical: "Sports", title: "Global Sports Report",
    headline: stories[0]?.headline || "Global Sports Report",
    updated_at: text(payload.generated_at) || text(homepage.updated_at),
    generated_at: text(payload.generated_at) || text(homepage.updated_at),
    source_mode: "sports_desk_editorial", live_newsroom: stories,
    homepage_cards: stories.slice(0, 8), sections: [], editor_signals: [], key_storylines: [],
  };
}
