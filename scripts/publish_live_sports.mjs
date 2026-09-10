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

// Validate every selected payload before changing a live object. The
// lightweight scoreboard workflow publishes only the desks object.
const allDefinitions = [
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

const definitions =
  process.env.GSR_PUBLISH_DESKS_ONLY === "1" ? allDefinitions.slice(0, 1) : allDefinitions;

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

  let verified = false;
  let lastStatus = "no response";
  for (let attempt = 1; attempt <= 6; attempt += 1) {
    const response = await fetch(
      `${uploaded.url}?verify=${publicationRunId}-${attempt}`,
      { cache: "no-store" },
    );
    lastStatus = `HTTP ${response.status}`;
    if (response.ok) {
      const received = Buffer.from(await response.arrayBuffer());
      const receivedHash = createHash("sha256").update(received).digest("hex");
      if (receivedHash === payload.sha256) {
        verified = true;
        break;
      }
      lastStatus = `${lastStatus}, SHA-256 ${receivedHash}`;
    }
    if (attempt < 6) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
  if (!verified) {
    throw new Error(
      `Uploaded ${payload.pathname} did not become readable after verification retries (${lastStatus}).`,
    );
  }

  console.log(
    `Published and verified ${payload.pathname}; timestamp=${payload.parsed[payload.timestamp]}; run=${publicationRunId}`,
  );
}

console.log(`Sports publication complete: run=${publicationRunId}`);
