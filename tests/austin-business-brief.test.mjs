import assert from "node:assert/strict";
import test from "node:test";

import { buildAustinBusinessBrief } from "../lib/austinBusinessBrief.ts";

const sourcedStory = (headline, url) => ({
  headline,
  context: "Austin's technology employers are adding a major new campus and local jobs.",
  source: "Example News",
  published_at: "2026-08-17T10:00:00Z",
  url,
});

test("Austin brief renders source-backed context", () => {
  const items = buildAustinBusinessBrief([
    sourcedStory("Technology employer announces major Austin expansion", "https://example.com/austin-expansion"),
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].context, "Austin's technology employers are adding a major new campus and local jobs.");
  assert.equal(items[0].source, "Example News");
});

test("Austin brief supports at most three qualifying stories", () => {
  const items = buildAustinBusinessBrief([
    sourcedStory("Austin technology campus expansion one", "https://example.com/one"),
    sourcedStory("Austin technology campus expansion two", "https://example.com/two"),
    sourcedStory("Austin technology campus expansion three", "https://example.com/three"),
    sourcedStory("Austin technology campus expansion four", "https://example.com/four"),
  ]);

  assert.equal(items.length, 3);
});

test("Austin brief does not require three stories", () => {
  assert.equal(buildAustinBusinessBrief([
    sourcedStory("Technology employer announces major Austin expansion", "https://example.com/austin"),
  ]).length, 1);
  assert.equal(buildAustinBusinessBrief([]).length, 0);
});

test("Austin brief rejects routine sports and nonlocal business coverage", () => {
  assert.equal(buildAustinBusinessBrief([{
    headline: "Austin FC wins Saturday match",
    context: "Austin FC scored twice at home in the final score.",
    source: "Example News",
    url: "https://example.com/match",
  }]).length, 0);
  assert.equal(buildAustinBusinessBrief([{
    headline: "Technology company announces data center investment",
    context: "The project will be built in Phoenix.",
    source: "Example News",
    url: "https://example.com/phoenix",
  }]).length, 0);
});

test("Austin brief removes duplicate headlines", () => {
  const story = sourcedStory("Austin employer announces major technology campus", "https://example.com/original");
  assert.equal(buildAustinBusinessBrief([
    story,
    { ...story, url: "https://example.com/syndicated" },
  ]).length, 1);
});
