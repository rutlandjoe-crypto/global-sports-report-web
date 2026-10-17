import Link from 'next/link';
import { gsrSportsThoughts, sportsThoughtDate, sportsThoughtUrl } from '@/lib/gsrSportsThoughts';

function paragraphContent(text: string) {
  return text.split(/(\[[^\]]+\]\(https?:\/\/[^)]+\))/g).map((part, index) => {
    const match = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (!match) return part;
    return <a key={index} href={match[2]} className="font-semibold text-red-700 underline underline-offset-4">{match[1]}</a>;
  });
}

export default function GsrSportsThoughts({ desk, featured = false }: { desk?: string; featured?: boolean }) {
  const stories = gsrSportsThoughts.filter(story => !desk || story.desk === desk);
  if (!stories.length) return null;
  const lead = featured ? stories[0] : null;
  const archive = featured ? stories.slice(1) : stories;
  return (
    <section id="gsr-sports-thoughts" aria-labelledby="gsr-sports-thoughts-heading" className="mb-8 scroll-mt-24 rounded-2xl border border-neutral-300 bg-white p-5 shadow-sm">
      <h2 id="gsr-sports-thoughts-heading" className="mb-4 text-xl font-black text-red-700">GSR Sports Thoughts</h2>
      {lead ? (
        <article aria-labelledby="featured-sports-thought-title">
          <h3 id="featured-sports-thought-title" className="text-3xl font-black leading-tight sm:text-4xl lg:text-5xl"><Link className="hover:text-red-700 hover:underline" href={sportsThoughtUrl(lead.slug)}>{lead.title}</Link></h3>
          <p className="mt-4 text-sm font-bold text-neutral-800">By {lead.author}</p>
          <time className="mt-1 block text-xs text-neutral-600" dateTime={lead.publishedAt}>{sportsThoughtDate(lead.publishedAt)}</time>
          <div className="sports-thought-columns mt-6 text-base leading-7 text-neutral-800">
            {lead.paragraphs.map((text, index) => <p key={index}>{paragraphContent(text)}</p>)}
          </div>
          <Link href={sportsThoughtUrl(lead.slug)} className="mt-5 inline-block text-sm font-bold text-red-700 underline underline-offset-4">Permanent article link →</Link>
        </article>
      ) : null}
      {archive.length ? (
        <div className={lead ? 'mt-8 border-t border-neutral-200 pt-5' : ''}>
          {lead ? <h3 className="mb-4 text-lg font-black">More GSR Sports Thoughts</h3> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {archive.map(story => (
              <article key={story.slug} className="flex min-h-40 flex-col rounded-xl border border-neutral-200 p-4">
                <h4 className="text-lg font-black leading-6"><Link className="hover:text-red-700 hover:underline" href={sportsThoughtUrl(story.slug)}>{story.title}</Link></h4>
                <p className="mt-2 text-sm font-bold text-neutral-800">By {story.author}</p>
                <time className="mt-1 text-xs text-neutral-600" dateTime={story.publishedAt}>{sportsThoughtDate(story.publishedAt)}</time>
                <Link href={sportsThoughtUrl(story.slug)} className="mt-auto pt-4 text-sm font-bold text-red-700 underline underline-offset-4">Read story →</Link>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
