import fs from "node:fs";
import { get } from "@vercel/blob";

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error("BLOB_READ_WRITE_TOKEN is not configured.");
}

const pathname = "reports/sports_desks.json";
const live = await get(pathname, {
  access: "public",
  token: process.env.BLOB_READ_WRITE_TOKEN,
  abortSignal: AbortSignal.timeout(10_000),
  headers: { "Cache-Control": "no-cache" },
});

if (!live || live.statusCode !== 200) {
  throw new Error(`Live ${pathname} is unavailable (status ${live?.statusCode ?? "unknown"}).`);
}

const body = await new Response(live.stream).text();
const parsed = JSON.parse(body);
if (!parsed.verified_at || !parsed.desks) {
  throw new Error(`Live ${pathname} is missing required Sports Desk fields.`);
}

fs.writeFileSync("public/sports_desks.json", `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
console.log(`Downloaded current ${pathname}; verified_at=${parsed.verified_at}`);
