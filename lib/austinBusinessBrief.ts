export type AustinStory = Record<string, unknown>;

export type AustinBriefField = {
  label: string;
  value: string;
};

export type AustinBriefItem = {
  headline: string;
  url: string;
  source: string;
  fields: AustinBriefField[];
};

function text(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(text).filter(Boolean);
  const valueText = text(value);
  return valueText ? [valueText] : [];
}

function storyText(story: AustinStory): string {
  return [
    story.headline,
    story.title,
    story.source_headline,
    story.original_headline,
    story.snapshot,
    story.summary,
    story.description,
    ...list(story.key_data),
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

function firstMatch(input: string, choices: Array<[RegExp, string]>): string {
  return choices.find(([pattern]) => pattern.test(input))?.[1] || "";
}

function reportedValue(input: string): string {
  return (
    input.match(/\$\s?\d[\d,.]*(?:\.\d+)?\s?(?:trillion|billion|million|thousand|tn|bn|m)?\b/i)?.[0] || ""
  ).replace(/\s+/g, " ");
}

function organizations(story: AustinStory): string {
  const line = list(story.key_data).find((item) =>
    /^(?:key people or organizations|company \/ organization|companies \/ organizations):/i.test(item)
  );
  return line ? line.replace(/^[^:]+:\s*/, "") : "";
}

function sourceName(story: AustinStory): string {
  return text(story.source_label) || text(story.publisher) || text(story.source_name) || text(story.source) || "Original source";
}

function published(story: AustinStory): string {
  return text(story.published) || text(story.published_at) || text(story.date);
}

export function buildAustinBusinessBrief(stories: AustinStory[]): AustinBriefItem[] {
  const location = /\b(Austin|Central Texas|Travis County|Williamson County|Hays County|Round Rock|Georgetown|Pflugerville|Cedar Park|San Marcos)\b/i;
  const business = /\b(employer|hiring|jobs?|technology|artificial intelligence|\bAI\b|semiconductor|chips?|data cent(?:er|re)|commercial real estate|office|industrial|development|relocat(?:e|ion)|expan(?:d|sion)|venture capital|funding|investment|media|stadium|arena|ownership|sponsor(?:ship)?|franchise|convention|conference|economic impact|infrastructure|transportation|transit|airport|energy|utility|construction|headquarters|campus)\b/i;
  const seen = new Set<string>();
  const items: AustinBriefItem[] = [];

  for (const story of stories) {
    const input = storyText(story);
    const locationMatch = input.match(location)?.[0] || "";
    const itemHeadline = headline(story);
    const url = sourceUrl(story);
    if (!locationMatch || !business.test(input) || !itemHeadline || !url) continue;

    const key = `${itemHeadline.toLowerCase()}|${url}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const sector = firstMatch(input, [
      [/\bsemiconductor|chips?\b/i, "Semiconductors"],
      [/\bdata cent(?:er|re)|artificial intelligence|\bAI\b|technology\b/i, "Technology / AI"],
      [/\bcommercial real estate|office|industrial|development|construction|campus\b/i, "Commercial real estate / development"],
      [/\bventure capital|funding|investment\b/i, "Investment / venture capital"],
      [/\bstadium|arena|ownership|sponsor(?:ship)?|franchise\b/i, "Sports business"],
      [/\bconvention|conference|economic impact\b/i, "Conventions / events"],
      [/\btransportation|transit|airport|infrastructure\b/i, "Infrastructure / transportation"],
      [/\benergy|utility\b/i, "Energy"],
      [/\bmedia\b/i, "Media"],
      [/\bemployer|hiring|jobs?|headquarters|relocat(?:e|ion)|expan(?:d|sion)\b/i, "Major employers"],
    ]);
    const itemStatus = firstMatch(input, [
      [/\bproposed|proposal|seeking approval\b/i, "Proposed"],
      [/\bplanned|plans? to|will (?:build|open|invest|expand)|announced\b/i, "Announced / planned"],
      [/\bunder construction|construction began|broke ground\b/i, "Under construction"],
      [/\bcompleted|opened|operational|launched\b/i, "Completed / operational"],
      [/\breportedly|report says|according to\b/i, "Reported"],
    ]);
    const relevance = sector
      ? `Potential follow-up: decision-makers, investment, hiring, facilities and service-provider implications connected to this ${sector.toLowerCase()} development.`
      : "Potential follow-up: decision-makers, investment, hiring, facilities and service-provider implications tied to the sourced development.";

    const fields = [
      { label: "Company / organization", value: organizations(story) },
      { label: "Development", value: itemHeadline },
      { label: "Austin / Central Texas connection", value: locationMatch },
      { label: "Sector", value: sector },
      { label: "Reported investment / value", value: reportedValue(input) },
      { label: "Status / date", value: [itemStatus, published(story)].filter(Boolean).join(" · ") },
      {
        label: "Business significance",
        value: `A sourced ${sector ? sector.toLowerCase() : "business"} development with a direct ${locationMatch} connection.`,
      },
      { label: "Reporting / commercial relevance", value: relevance },
    ].filter((field) => Boolean(field.value));

    items.push({ headline: itemHeadline, url, source: sourceName(story), fields });
    if (items.length === 5) break;
  }

  return items;
}
