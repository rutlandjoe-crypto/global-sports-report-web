// ONLY CHANGE: content block REMOVED

// everything above stays EXACTLY the same until SectionCard

function SectionCard({
  section,
  index,
}: {
  section: JsonObject;
  index: number;
}) {
  const title = getSectionTitle(section, index);
  const headline = cleanText(section.headline);
  const snapshot = cleanText(section.snapshot);
  const storylines = getStorylines(section);
  const updated = cleanText(section.updated_at || section.generated_at);

  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Badge>{title}</Badge>

          {headline && (
            <h2 className="mt-4 text-2xl font-black leading-tight text-neutral-950">
              {headline}
            </h2>
          )}
        </div>

        {updated && (
          <p className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-700">
            {updated}
          </p>
        )}
      </div>

      {snapshot && (
        <p className="mb-5 text-base font-semibold leading-7 text-neutral-800">
          {snapshot}
        </p>
      )}

      {storylines.length > 0 && (
        <div className="mb-5 space-y-3">
          {storylines.slice(0, 6).map((item, i) => (
            <div
              key={`${title}-story-${i}`}
              className="border-l-4 border-red-700 bg-neutral-50 px-4 py-3"
            >
              <p className="text-sm font-bold leading-6 text-neutral-950">
                {item}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ❌ REMOVED RAW CONTENT BLOCK */}
    </Card>
  );
}