import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { gsrSportsThoughts, sportsThoughtDate, sportsThoughtUrl } from '@/lib/gsrSportsThoughts';

type Props = { params: Promise<{ slug: string }> };
const base = 'https://www.globalsportsreport.com';

export function generateStaticParams() {
  return gsrSportsThoughts.map(story => ({ slug: story.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const story = gsrSportsThoughts.find(item => item.slug === slug);
  if (!story) notFound();
  const url = base + sportsThoughtUrl(story.slug);
  return {
    title: story.title + ' | Global Sports Report',
    description: story.paragraphs[0],
    authors: [{ name: story.author }],
    alternates: { canonical: url },
    openGraph: { type: 'article', title: story.title, description: story.paragraphs[0], url,
      publishedTime: story.publishedAt, authors: [story.author], siteName: 'Global Sports Report' },
    twitter: { card: 'summary', title: story.title, description: story.paragraphs[0] },
  };
}

function paragraphContent(text: string) {
  return text.split(/(\[[^\]]+\]\(https?:\/\/[^)]+\))/g).map((part, index) => {
    const match = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
    if (!match) return part;
    return <a key={index} href={match[2]} className="font-semibold text-red-700 underline underline-offset-4">{match[1]}</a>;
  });
}

export default async function SportsThoughtPage({ params }: Props) {
  const { slug } = await params;
  const story = gsrSportsThoughts.find(item => item.slug === slug);
  if (!story) notFound();
  const articleBody = story.paragraphs.map(text => text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')).join('\n\n');
  const structuredData = {
    '@context': 'https://schema.org', '@type': 'NewsArticle',
    headline: story.title, datePublished: story.publishedAt, dateModified: story.publishedAt,
    author: { '@type': 'Person', name: story.author },
    publisher: { '@type': 'Organization', name: 'Global Sports Report', url: base },
    mainEntityOfPage: { '@type': 'WebPage', '@id': base + sportsThoughtUrl(story.slug) },
    articleSection: 'GSR Sports Thoughts', articleBody,
  };
  return (
    <main className="min-h-screen bg-neutral-100 px-5 py-10 text-neutral-950">
      <article className="mx-auto max-w-3xl rounded-2xl border border-neutral-300 bg-white p-6 shadow-sm sm:p-10">
        <nav aria-label="Story navigation" className="mb-6 flex flex-wrap gap-5 text-sm font-bold text-red-700">
          <Link href="/">Global Sports Report</Link><Link href={'/' + story.desk}>NFL Sports Desk</Link>
        </nav>
        <p className="text-sm font-black uppercase tracking-wide text-red-700">GSR Sports Thoughts</p>
        <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">{story.title}</h1>
        <p className="mt-4 font-bold">By {story.author}</p>
        <time className="mt-2 block text-sm text-neutral-600" dateTime={story.publishedAt}>{sportsThoughtDate(story.publishedAt)}</time>
        <div className="mt-8 space-y-5 text-base leading-8">
          {story.paragraphs.map((text, index) => <p key={index}>{paragraphContent(text)}</p>)}
        </div>
      </article>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, '\\u003c') }} />
    </main>
  );
}
