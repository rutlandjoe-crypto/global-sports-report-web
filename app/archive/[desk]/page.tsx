import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  SPORTS_ARCHIVE_DESKS,
  getSportsArchiveDeskStories,
  type SportsArchiveDesk,
} from "@/lib/sportsArchive";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ desk: string }> };

function validDesk(value: string): value is SportsArchiveDesk {
  return value in SPORTS_ARCHIVE_DESKS;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { desk } = await params;
  if (!validDesk(desk)) return {};
  const label = SPORTS_ARCHIVE_DESKS[desk];
  return {
    title: `${label} Editorial Archive | Global Sports Report`,
    description: `Retained ${label} editorial selections from Global Sports Report.`,
    alternates: { canonical: `https://www.globalsportsreport.com/archive/${desk}` },
  };
}

export default async function SportsDeskArchivePage({ params }: Props) {
  const { desk } = await params;
  if (!validDesk(desk)) notFound();
  const label = SPORTS_ARCHIVE_DESKS[desk];
  const stories = getSportsArchiveDeskStories(desk);

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8">
        <div className="flex flex-wrap gap-4 text-sm font-bold text-[#315c8d]">
          <Link href={`/${desk}`} className="hover:underline">&larr; Current {label} Desk</Link>
          <Link href="/archive" className="hover:underline">All Archives</Link>
        </div>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-[#315c8d]">
          Global Sports Report
        </p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">{label} Editorial Archive</h1>
        <p className="mt-3 text-sm text-slate-600">{stories.length} retained stories</p>
        <div className="mt-8 space-y-4">
          {stories.map((story) => (
            <article key={story.slug} className="rounded-xl border border-[#dbe4f0] bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#315c8d]">
                {story.publisher}
              </p>
              <h2 className="mt-2 text-lg font-black leading-7 text-[#0f1c2e]">
                <Link href={`/stories/${story.slug}`} className="hover:text-[#315c8d] hover:underline">
                  {story.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                {new Date(story.publishedAt).toLocaleDateString("en-US", { timeZone: "UTC" })}
              </p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
