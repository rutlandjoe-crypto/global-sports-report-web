import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  SPORTS_ARCHIVE_DESKS,
  getSportsArchiveStory,
  sportsStoryDescription,
} from "@/lib/sportsArchive";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = getSportsArchiveStory(slug);
  if (!story) return {};
  return {
    title: `${story.title} | Global Sports Report`,
    description: sportsStoryDescription(story),
    alternates: { canonical: `https://www.globalsportsreport.com/stories/${story.slug}` },
  };
}

export default async function SportsStoryPage({ params }: Props) {
  const { slug } = await params;
  const story = getSportsArchiveStory(slug);
  if (!story) notFound();
  const deskLabel = SPORTS_ARCHIVE_DESKS[story.desk] || "Sports";

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <article className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
        <div className="flex flex-wrap gap-4 text-sm font-bold text-[#315c8d]">
          <Link href={`/${story.desk}`} className="hover:underline">&larr; Current {deskLabel} Desk</Link>
          <Link href={`/archive/${story.desk}`} className="hover:underline">{deskLabel} Archive</Link>
        </div>
        <p className="mt-8 text-xs font-bold uppercase tracking-[0.2em] text-[#315c8d]">
          {deskLabel} &middot; {story.publisher}
        </p>
        <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight text-[#0f1c2e] sm:text-5xl">
          {story.title}
        </h1>
        <p className="mt-4 text-sm text-slate-500">
          Published by {story.publisher} on {new Date(story.publishedAt).toLocaleString("en-US", {
            dateStyle: "long",
            timeStyle: "short",
            timeZone: "America/New_York",
          })} ET
        </p>
        <section className="mt-8 rounded-2xl border border-[#dbe4f0] bg-white p-6 shadow-sm sm:p-8">
          <p className="text-lg leading-8 text-slate-700">{story.summary}</p>
          <a
            href={story.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex font-bold text-[#315c8d] underline underline-offset-4"
          >
            Read the original report from {story.publisher} <span aria-hidden="true">&nbsp;&nearr;</span>
          </a>
        </section>
      </article>
    </main>
  );
}
