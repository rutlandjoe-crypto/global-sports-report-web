/*
 * GLOBAL SPORTS REPORT — PERMANENT EDITORIAL POLICY
 *
 * This module exists to keep scoreboard data and editorial presentation
 * separate. Do not replace these rules with team-specific fixes.
 */

export type ScoreSide = {
  name: string;
  score: number;
};

const GENERIC_DECK_PATTERNS = [
  /the result should be read through/i,
  /quarterback efficiency,\s*trench play/i,
  /coaching decisions,\s*injury fallout/i,
  /whether the outcome changes .*roster narratives/i,
  /division,\s*playoff or roster narratives/i,
];

export function winnerFirstFinal(
  teamA: ScoreSide,
  teamB: ScoreSide
): string {
  if (
    !teamA?.name ||
    !teamB?.name ||
    !Number.isFinite(Number(teamA.score)) ||
    !Number.isFinite(Number(teamB.score))
  ) {
    throw new Error("Invalid completed-game score.");
  }

  const a = Number(teamA.score);
  const b = Number(teamB.score);

  if (b > a) {
    return `${teamB.name} ${b}, ${teamA.name} ${a} — Final`;
  }

  return `${teamA.name} ${a}, ${teamB.name} ${b} — Final`;
}

export function isGenericSportsDeck(deck: unknown): boolean {
  if (typeof deck !== "string") return false;
  return GENERIC_DECK_PATTERNS.some((pattern) => pattern.test(deck));
}

export function safeSportsDeck(
  deck: unknown,
  fallback: string
): string {
  const candidate =
    typeof deck === "string" ? deck.trim() : "";

  if (candidate && !isGenericSportsDeck(candidate)) {
    return candidate;
  }

  return fallback.trim();
}

export function isBareScoreHeadline(headline: unknown): boolean {
  if (typeof headline !== "string") return false;

  const value = headline.trim();

  return (
    /\d+.*,\s*.+\d+.*(?:—|-)\s*final/i.test(value) ||
    /^[A-Z]{2,4}\s+\d+,\s*[A-Z]{2,4}\s+\d+/i.test(value)
  );
}

export function chooseEditorialHeadline(
  sourcedHeadline: unknown,
  generatedHeadline: unknown
): string {
  const sourced =
    typeof sourcedHeadline === "string"
      ? sourcedHeadline.trim()
      : "";

  const generated =
    typeof generatedHeadline === "string"
      ? generatedHeadline.trim()
      : "";

  /*
   * Real sourced news copy outranks a generated scoreboard string.
   */
  if (sourced && !isBareScoreHeadline(sourced)) {
    return sourced;
  }

  if (generated && !isBareScoreHeadline(generated)) {
    return generated;
  }

  return sourced || generated;
}

/*
 * NON-NEGOTIABLE GSR SPORTS RULES
 *
 * FINAL SCORES:
 * WINNER SCORE, LOSER SCORE — Final
 *
 * Example:
 * San Francisco 49ers 36, Arizona Cardinals 30 — Final
 *
 * EDITORIAL:
 * A scoreboard line is game data. It must not automatically outrank
 * a legitimate sourced news headline.
 *
 * DECKS:
 * Reusable analytical filler is prohibited. A deck must describe
 * verified facts specific to the story/game.
 */

/*
 * PERMANENT STORY DEDUPLICATION
 *
 * Sports journalism can arrive through multiple feeds or representations
 * of the same event. A story may appear only once in a publication lane.
 *
 * Identity priority:
 *   1. event/game ID
 *   2. canonical/original URL
 *   3. normalized source headline
 *
 * This is editorial deduplication. Structured score objects remain
 * separate from journalism and must not be converted into stories.
 */

export function sportsEditorialIdentity(story: any): string {
  const eventId = String(
    story?.event_id ??
    story?.game_id ??
    ""
  ).trim().toLowerCase();

  if (eventId) {
    return `event:${eventId}`;
  }

  const url = String(
    story?.canonical_url ??
    story?.url ??
    ""
  )
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");

  if (url) {
    return `url:${url}`;
  }

  const headline = String(
    story?.source_headline ??
    story?.original_headline ??
    story?.title ??
    story?.headline ??
    ""
  )
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  return headline ? `headline:${headline}` : "";
}

export function dedupeSportsEditorialStories<T = any>(
  stories: T[]
): T[] {
  const seen = new Set<string>();
  const output: T[] = [];

  for (const story of stories || []) {
    const identity = sportsEditorialIdentity(story);

    if (!identity) {
      continue;
    }

    if (seen.has(identity)) {
      continue;
    }

    seen.add(identity);
    output.push(story);
  }

  return output;
}

export function removeHeroDuplicateFromBriefing<T = any>(
  hero: any,
  briefing: T[]
): T[] {
  const heroIdentity = sportsEditorialIdentity(hero);

  return dedupeSportsEditorialStories(briefing).filter(
    (story: any) =>
      !heroIdentity ||
      sportsEditorialIdentity(story) !== heroIdentity
  );
}
