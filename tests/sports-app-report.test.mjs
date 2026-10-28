import test from "node:test";
import assert from "node:assert/strict";
import { sportsAppReport } from "../lib/sportsAppReport.ts";
import { isFreshLiveGameItem } from "../lib/liveGameFreshness.ts";

const now = Date.parse("2026-10-28T16:00:00Z");
const article = (overrides = {}) => ({ title: "Team announces a new starting quarterback", summary: "A sourced team announcement.", url: "https://news.example/nfl/quarterback-change", publisher: "Example News", published_at: "2026-10-28T15:00:00Z", desk: "nfl", ...overrides });

test("object-shaped desks produce source-linked app arrays, not legacy report sections", () => {
  const input = { generated_at: "2026-10-28T15:30:00Z", desks: { nfl: { label: "NFL", stories: [article()] } } };
  const before = JSON.stringify(input);
  const report = sportsAppReport(input, isFreshLiveGameItem, now);
  assert.equal(report.live_newsroom.length, 1);
  assert.equal(report.live_newsroom[0].source_name, "Example News");
  assert.equal(report.live_newsroom[0].url, article().url);
  assert.equal(report.live_newsroom[0].age_hours, "1.00");
  assert.ok(Array.isArray(report.sections));
  assert.equal(JSON.stringify(input), before);
});

test("homepage and desk duplicates appear once", () => {
  const report = sportsAppReport({ homepage: { hero: article(), stories: [article()] }, desks: { nfl: { stories: [article()] } } }, isFreshLiveGameItem, now);
  assert.equal(report.live_newsroom.length, 1);
});

test("raw scores, expired live claims, bad URLs and report status messages are excluded", () => {
  const rows = [article(), article({ id: "score:nfl:123", title: "Team A 10, Team B 3 — Final" }), article({ title: "Live game updates", starts_at: "2026-10-28T10:00:00Z" }), article({ title: "Bad link", url: "javascript:alert(1)" }), article({ title: "Source refresh needed" })];
  const report = sportsAppReport({ homepage: { stories: rows } }, isFreshLiveGameItem, now);
  assert.equal(report.live_newsroom.length, 1);
});

test("current NFL reporting outranks an ordinary recent article", () => {
  const report = sportsAppReport({ homepage: { stories: [article({ title: "A routine baseball update", desk: "mlb", url: "https://news.example/mlb/update", published_at: "2026-10-28T15:30:00Z" }), article()] } }, isFreshLiveGameItem, now);
  assert.equal(report.live_newsroom[0].headline, article().title);
});

test("missing or malformed collections return safe empty arrays", () => {
  for (const payload of [null, {}, { desks: { nfl: { stories: {} } }, homepage: { stories: {} } }]) {
    const report = sportsAppReport(payload, isFreshLiveGameItem, now);
    assert.deepEqual(report.live_newsroom, []);
    assert.deepEqual(report.sections, []);
  }
});
