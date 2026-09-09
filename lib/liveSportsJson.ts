import fs from "fs";
import path from "path";
import { get } from "@vercel/blob";

export async function readLiveSportsJson<T>(
  pathname: string,
  fallbackFilename: string,
): Promise<T> {
  // `get(pathname)` constructs the canonical object URL from the store token
  // and retrieves it in one request. Avoid metadata/list calls on the render
  // path: the desks payload is large enough that an extra round trip can exceed
  // Vercel's server-rendering window on a cold start.
  try {
    const latest = await get(pathname, {
      access: "public",
      abortSignal: AbortSignal.timeout(6_000),
      headers: { "Cache-Control": "no-cache" },
    });
    if (latest?.statusCode === 200) {
      return (await new Response(latest.stream).json()) as T;
    }
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
