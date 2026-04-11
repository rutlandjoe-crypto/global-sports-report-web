import { list } from "@vercel/blob";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { blobs } = await list({
      prefix: "reports/latest_report.json",
      limit: 1,
    });

    const latest = blobs.find((b) => b.pathname === "reports/latest_report.json");

    if (!latest) {
      return NextResponse.json({ error: "Live report not found" }, { status: 404 });
    }

    const response = await fetch(latest.url, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Could not fetch live report" }, { status: 502 });
    }

    const json = await response.json();

    return NextResponse.json(json, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error) {
    console.error("report route error:", error);
    return NextResponse.json({ error: "Failed to load live report" }, { status: 500 });
  }
}