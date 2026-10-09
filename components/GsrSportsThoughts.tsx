import Link from 'next/link';
import { gsrSportsThoughts, sportsThoughtDate, sportsThoughtUrl } from '@/lib/gsrSportsThoughts';

export default function GsrSportsThoughts({ desk }: { desk?: string }) {
  const stories = gsrSportsThoughts.filter(story => !desk || story.desk === desk);
  if (!stories.length) return null;
  return (
    <section id="gsr-sports-thoughts" aria-labelledby="gsr-sports-thoughts-heading" className="mb-8 scroll-mt-24 rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm">
      <h2 id="gsr-sports-thoughts-heading" className="mb-4 text-xl font-black text-red-700">GSR Sports Thoughts</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {stories.map(story => (
          <article key={story.slug} className="flex min-h-40 flex-col rounded-xl border border-neutral-200 p-4">
            <h3 className="text-lg font-black leading-6"><Link className="hover:text-red-700 hover:underline" href={sportsThoughtUrl(story.slug)}>{story.title}</Link></h3>
            <p className="mt-2 text-sm font-bold text-neutral-800">By {story.author}</p>
            <time className="mt-1 text-xs text-neutral-600" dateTime={story.publishedAt}>{sportsThoughtDate(story.publishedAt)}</time>
            <Link href={sportsThoughtUrl(story.slug)} className="mt-auto pt-4 text-sm font-bold text-red-700 underline underline-offset-4">Read story →</Link>
          </article>
        ))}
      </div>
    </section>
  );
}
