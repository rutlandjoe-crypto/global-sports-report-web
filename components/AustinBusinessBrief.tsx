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
        <div className="mt-4 space-y-4">
          {items.map((item) => (
            <article key={`${item.headline}-${item.url}`} className="rounded-xl border border-amber-200 bg-white p-4">
              <h3 className="font-black leading-6 text-neutral-950">{item.headline}</h3>
              <dl className="mt-3 grid gap-2 text-sm">
                {item.fields.map((field) => (
                  <div key={`${item.url}-${field.label}`} className="grid gap-1 border-b border-neutral-200 pb-2 sm:grid-cols-[12rem_1fr]">
                    <dt className="font-black text-neutral-600">{field.label}</dt>
                    <dd className="leading-5 text-neutral-800">{field.value}</dd>
                  </div>
                ))}
              </dl>
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
          No qualifying Austin or Central Texas business development is supported by the current Sports source material.
        </p>
      )}
    </section>
  );
}
