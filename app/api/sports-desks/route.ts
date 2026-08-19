import { NextResponse } from "next/server";
import { readLiveSportsJson } from "@/lib/liveSportsJson";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const payload = await readLiveSportsJson<Record<string, unknown>>(
      "reports/sports_desks.json",
      "sports_desks.json",
    );
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error) {
    console.error("sports-desks route error:", error);
    return NextResponse.json(
      { error: "Failed to load Sports desks" },
      { status: 500 },
    );
  }
}
