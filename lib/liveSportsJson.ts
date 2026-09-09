import fs from "fs";
import path from "path";
import { head } from "@vercel/blob";

export async function readLiveSportsJson<T>(
  pathname: string,
  fallbackFilename: string,
): Promise<T> {
  // `head(pathname)` addresses the one canonical object directly. The old
  // `list()` scan made cold renders wait long enough to exceed Vercel's server
  // rendering window for the 1+ MB desks payload.
  try {
    const latest = await head(pathname);
    const response = await fetch(`${latest.url}?freshness=${Date.now()}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });
    if (response.ok) return (await response.json()) as T;
  } catch (error) {
    console.error(`Live Sports payload unavailable for ${pathname}:`, error);
  }

  // Fail open for site availability, but the independent display-time live-game
  // guard still fails closed for expired or unverifiable live cards.
  const publishedFile = path.join(process.cwd(), "public", fallbackFilename);
  try {
    return JSON.parse(fs.readFileSync(publishedFile, "utf8")) as T;
  } catch (error) {
    console.error(`Published Sports fallback unavailable for ${fallbackFilename}:`, error);
  }

  throw new Error(`Sports payload unavailable for ${fallbackFilename}`);
}
