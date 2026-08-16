import assert from "node:assert/strict";
import test from "node:test";

import { buildAustinBusinessBrief } from "../lib/austinBusinessBrief.ts";

test("Austin brief requires sourced local and business signals", () => {
  const items = buildAustinBusinessBrief([{
    title: "Chipmaker announces $2 billion Austin expansion",
    summary: "The semiconductor company plans a new Central Texas campus.",
    publisher: "Example News",
    published: "2026-08-16",
    url: "https://example.com/austin-expansion",
  }]);

  assert.equal(items.length, 1);
  assert.equal(items[0].fields.find((field) => field.label === "Reported investment / value")?.value, "$2 billion");
  assert.equal(items[0].fields.find((field) => field.label === "Sector")?.value, "Semiconductors");
});

test("Austin brief rejects ordinary Austin sports coverage", () => {
  assert.equal(buildAustinBusinessBrief([{
    title: "Austin FC wins Saturday match",
    summary: "Austin FC scored twice at home.",
    url: "https://example.com/match",
  }]).length, 0);
});

test("Austin brief rejects business stories without a real Central Texas connection", () => {
  assert.equal(buildAustinBusinessBrief([{
    title: "Technology company announces data center investment",
    summary: "The project will be built in Phoenix.",
    url: "https://example.com/phoenix",
  }]).length, 0);
});
