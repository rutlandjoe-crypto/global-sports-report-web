import fs from "node:fs";
import { createHash } from "node:crypto";
import { put } from "@vercel/blob";

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
}

const publicationRunId = [
  process.env.GITHUB_RUN_ID ?? "local",
  process.env.GITHUB_RUN_ATTEMPT ?? "1",
  Date.now(),
].join("-");

// Validate both payloads before changing either live object. Desks publish
// first, so a failure cannot expose a new homepage with older desk data.
const definitions = [
  {
    file: "public/sports_desks.json",
    pathname: "reports/sports_desks.json",
    timestamp: "verified_at",
  },
  {
    file: "public/latest_report.json",
    pathname: "reports/latest_report.json",
    timestamp: "updated_at",
  },
];

const prepared = definitions.map((definition) => {
  const parsed = JSON.parse(fs.readFileSync(definition.file, "utf8"));
  if (!parsed[definition.timestamp]) {
    throw new Error(`${definition.file} is missing ${definition.timestamp}.`);
  }
  parsed.publication_run_id = publicationRunId;
  const body = Buffer.from(`${JSON.stringify(parsed, null, 2)}\n`, "utf8");
  const sha256 = createHash("sha256").update(body).digest("hex");
  return { ...definition, parsed, body, sha256 };
});

for (const payload of prepared) {
  const uploaded = await put(payload.pathname, payload.body, {
    access: "public",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });

  const response = await fetch(`${uploaded.url}?verify=${publicationRunId}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Uploaded ${payload.pathname} could not be verified: HTTP ${response.status}`);
  }
  const received = Buffer.from(await response.arrayBuffer());
  const receivedHash = createHash("sha256").update(received).digest("hex");
  if (receivedHash !== payload.sha256) {
    throw new Error(`Uploaded ${payload.pathname} failed SHA-256 verification.`);
  }

  console.log(
    `Published and verified ${payload.pathname}; timestamp=${payload.parsed[payload.timestamp]}; run=${publicationRunId}`,
  );
}

console.log(`Sports publication complete: run=${publicationRunId}`);
