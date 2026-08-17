import type { Metadata } from "next";
import Link from "next/link";
import {
  SPORTS_ARCHIVE_DESKS,
  getSportsArchiveStories,
} from "@/lib/sportsArchive";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sports Editorial Archive | Global Sports Report",
  description: "Durable Global Sports Report editorial selections organized by Sports Desk.",
  alternates: { canonical: "https://www.globalsportsreport.com/archive" },
};

export default function SportsArchivePage() {
  const stories = getSportsArchiveStories();
  const counts = new Map<string, number>();
  for (const story of stories) counts.set(story.desk, (counts.get(story.desk) || 0) + 1);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <Link href="/" className="text-sm font-bold text-[#315c8d] hover:underline">
          &larr; Global Sports Report
        </Link>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-[#315c8d]">
          Global Sports Report
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">Sports Editorial Archive</h1>
        <p className="mt-4 max-w-3xl leading-7 text-slate-600">
          Previously selected reporting remains available by desk with its original source headline,
          publication details, and source attribution.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {Object.entries(SPORTS_ARCHIVE_DESKS).map(([desk, label]) => (
            <Link
              key={desk}
              href={`/archive/${desk}`}
              className="rounded-xl border border-[#dbe4f0] bg-white p-5 shadow-sm hover:border-[#8fb3d9]"
            >
              <h2 className="text-xl font-black text-[#0f1c2e]">{label}</h2>
              <p className="mt-2 text-sm text-slate-600">{counts.get(desk) || 0} retained stories</p>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
