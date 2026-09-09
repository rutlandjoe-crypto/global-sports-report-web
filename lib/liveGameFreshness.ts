const LIVE_STATUS =
  /(?:\b(?:live|in[ -]?progress|halftime|half[ -]?time)\b|\b\d{1,3}(?:st|nd|rd|th)?(?:\s+minute|['′]))/i;
const FINAL_STATUS = /\b(?:final|full[ -]?time|ft)\b/i;
const THREE_HOURS_MS = 3 * 60 * 60 * 1000;
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export function isFreshLiveGameItem(
  item: Record<string, unknown>,
  nowMs: number = Date.now(),
): boolean {
  const text = [item.title, item.headline, item.status, item.summary, item.snapshot]
    .map((value) => String(value ?? ""))
    .join(" ");
  const state = String(item.event_state ?? item.state ?? "").toLowerCase();
  const claimsLive = state === "in" || LIVE_STATUS.test(text);

  if (!claimsLive) return true;
  if (state === "post" || (FINAL_STATUS.test(text) && !LIVE_STATUS.test(text))) {
    return true;
  }

  const rawStart =
    item.starts_at ?? item.start_time ?? item.startTime ?? item.kickoff ?? item.date;
  if (!rawStart) return false;

  const startMs = Date.parse(String(rawStart));
  if (!Number.isFinite(startMs)) return false;

  const ageMs = nowMs - startMs;
  return ageMs >= -FUTURE_TOLERANCE_MS && ageMs <= THREE_HOURS_MS;
}
