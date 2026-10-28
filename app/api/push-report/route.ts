import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { readSportsDeskPayload } from "@/lib/sportsDesks";
import { isFreshLiveGameItem } from "@/lib/liveGameFreshness";
import { sportsAppReport } from "@/lib/sportsAppReport";

export const dynamic = "force-dynamic";

// Android already tries this address first. Serve the current article desks in
// its expected schema; authenticated report publication remains POST-only.
export async function GET() {
  const report = sportsAppReport(await readSportsDeskPayload(), isFreshLiveGameItem);
  return NextResponse.json(report, {
    status: report.live_newsroom.length ? 200 : 503,
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
  });
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedToken = process.env.GSR_PUSH_TOKEN;

    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bodyText = await request.text();

    if (!bodyText) {
      return NextResponse.json({ error: "Empty body" }, { status: 400 });
    }

    const parsed = JSON.parse(bodyText);

    if (!parsed.title || !parsed.updated_at) {
      return NextResponse.json({ error: "Invalid report JSON" }, { status: 400 });
    }

    const blob = await put("reports/latest_report.json", bodyText, {
      access: "public",
      allowOverwrite: true,
      addRandomSuffix: false,
      contentType: "application/json",
    });

    return NextResponse.json({
      ok: true,
      url: blob.url,
      title: parsed.title,
      updated_at: parsed.updated_at,
    });
  } catch (error) {
    console.error("push-report error:", error);
    return NextResponse.json({ error: "Failed to upload report" }, { status: 500 });
  }
}
