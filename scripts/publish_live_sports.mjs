import fs from "node:fs";
import { put } from "@vercel/blob";

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
}

const payloads = [
  {
    file: "public/latest_report.json",
    pathname: "reports/latest_report.json",
    timestamp: "updated_at",
  },
  {
    file: "public/sports_desks.json",
    pathname: "reports/sports_desks.json",
    timestamp: "generated_at",
  },
];

for (const payload of payloads) {
  const body = fs.readFileSync(payload.file);
  const parsed = JSON.parse(body.toString("utf8"));
  if (!parsed[payload.timestamp]) {
    throw new Error(`${payload.file} is missing ${payload.timestamp}.`);
  }

  await put(payload.pathname, body, {
    access: "public",
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  console.log(
    `Published ${payload.pathname} timestamp ${parsed[payload.timestamp]}`,
  );
}
