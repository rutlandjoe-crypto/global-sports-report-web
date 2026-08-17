import type { AustinBriefItem } from "@/lib/austinBusinessBrief";

export default function AustinBusinessBrief({ items }: { items: AustinBriefItem[] }) {
  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-wide text-amber-900">GSR Network Business Intelligence</p>
      <h2 className="mt-1 text-xl font-black text-neutral-950">Austin Global Business Brief</h2>
      <p className="mt-2 text-sm leading-6 text-neutral-700">
        A selective Austin and Central Texas business module, editorially separate from the Global Sports Report news feed.
      </p>

      {items.length ? (
        <div className="mt-4 divide-y divide-amber-200 border-y border-amber-200">
          {items.map((item) => (
            <article key={`${item.headline}-${item.url}`} className="bg-white px-1 py-4">
              <h3 className="font-black leading-6 text-neutral-950">{item.headline}</h3>
              <p className="mt-2 text-sm leading-6 text-neutral-700">{item.context}</p>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex text-sm font-black text-red-700 underline underline-offset-4"
              >
                Read original source · {item.source} <span aria-hidden="true">↗</span>
              </a>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-xl bg-white p-4 text-sm leading-6 text-neutral-700">
          No qualifying sourced Austin or Central Texas business development is available in the current rolling window.
        </p>
      )}
    </section>
  );
}
