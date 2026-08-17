export type AustinStory = Record<string, unknown>;

export type AustinBriefItem = {
  headline: string;
  context: string;
  url: string;
  source: string;
  publishedAt: string;
};

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function storyText(story: AustinStory): string {
  return [
    story.headline,
    story.title,
    story.source_headline,
    story.original_headline,
    story.context,
    story.snapshot,
    story.summary,
    story.description,
  ]
    .map(text)
    .filter(Boolean)
    .join(" ");
}

function headline(story: AustinStory): string {
  return text(story.source_headline) || text(story.original_headline) || text(story.headline) || text(story.title);
}

function sourceUrl(story: AustinStory): string {
  const url = text(story.url) || text(story.source_url) || text(story.link);
  return /^https?:\/\//i.test(url) ? url : "";
}

function sourceName(story: AustinStory): string {
  return text(story.source_label) || text(story.publisher) || text(story.source_name) || text(story.source) || "Original source";
}

function published(story: AustinStory): string {
  return text(story.published_at) || text(story.published) || text(story.date);
}

export function buildAustinBusinessBrief(stories: AustinStory[]): AustinBriefItem[] {
  const location = /\b(Austin|Central Texas|Travis County|Williamson County|Hays County|Round Rock|Georgetown|Pflugerville|Cedar Park|San Marcos|Taylor,? Texas)\b/i;
  const business = /\b(business|employer|workforce|hiring|jobs?|layoffs?|technology|artificial intelligence|AI|semiconductor|chips?|data cent(?:er|re)|commercial real estate|office|industrial|development|relocat(?:e|ion)|expan(?:d|sion)|venture capital|funding|financ(?:e|ing)|investment|property tax|tax rate|city budget|contract|media|stadium|arena|ownership|sponsor(?:ship)?|franchise|convention|conference|economic impact|infrastructure|transit|airport|energy|utility|construction|headquarters|campus|tourism|hospitality|hotel|manufacturing|facilit(?:y|ies))\b/i;
  const excluded = /\b(crime|murder|shooting|arrest|weather|forecast|traffic|lifestyle|restaurant opening|recipe|concert|celebrity|gossip|game recap|final score|podcast|webinar|sponsorship opportunities|giveaway)\b/i;
  const seen = new Set<string>();
  const items: AustinBriefItem[] = [];

  for (const story of stories) {
    const input = storyText(story);
    const itemHeadline = headline(story);
    const context = text(story.context) || text(story.summary) || text(story.snapshot) || text(story.description);
    const url = sourceUrl(story);
    if (!location.test(input) || !business.test(input) || excluded.test(input) || !itemHeadline || !context || !url) {
      continue;
    }

    const key = itemHeadline.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    items.push({
      headline: itemHeadline,
      context,
      url,
      source: sourceName(story),
      publishedAt: published(story),
    });
    if (items.length === 3) break;
  }

  return items;
}
