import fs from "fs";
import path from "path";
import { list } from "@vercel/blob";

export async function readLiveSportsJson<T>(
  pathname: string,
  fallbackFilename: string,
): Promise<T> {
  try {
    const { blobs } = await list({ prefix: pathname, limit: 100 });
    const latest = blobs
      .filter((blob) => blob.pathname === pathname)
      .sort(
        (left, right) =>
          new Date(right.uploadedAt ?? 0).getTime() -
          new Date(left.uploadedAt ?? 0).getTime(),
      )[0];

    if (latest) {
      const response = await fetch(latest.url, { cache: "no-store" });
      if (response.ok) return (await response.json()) as T;
    }
  } catch (error) {
    console.error(`Live Sports payload unavailable for ${pathname}:`, error);
  }

  const fallback = path.join(process.cwd(), "public", fallbackFilename);
  return JSON.parse(fs.readFileSync(fallback, "utf8")) as T;
}
