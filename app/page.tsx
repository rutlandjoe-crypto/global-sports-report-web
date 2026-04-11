export const dynamic = "force-dynamic";

type ReportSection = {
  name: string;
  content: string;
};

type ReportData = {
  title: string;
  headline?: string;
  key_storylines?: string[];
  sections?: ReportSection[];
  full_report?: string;
  updated_at?: string;
  disclaimer?: string;
};

async function getLiveReport(): Promise<ReportData | null> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const res = await fetch(`${baseUrl}/api/report`, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("API response not OK:", res.status);
      return null;
    }

    return await res.json();
  } catch (err) {
    console.error("Live fetch failed:", err);
    return null;
  }
}

export default async function Page() {
  const data = await getLiveReport();

  if (!data) {
    return (
      <main style={{ padding: "20px", fontFamily: "Arial" }}>
        <h1>Global Sports Report</h1>
        <p>Could not load the latest report.</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>{data.title}</h1>

      {data.updated_at && (
        <p>
          <strong>Updated:</strong> {data.updated_at}
        </p>
      )}

      {data.headline && (
        <>
          <h2>Headline</h2>
          <p>{data.headline}</p>
        </>
      )}

      {data.key_storylines && data.key_storylines.length > 0 && (
        <>
          <h2>Key Storylines</h2>
          <ul>
            {data.key_storylines.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </>
      )}

      {data.sections &&
        data.sections.map((section) => (
          <section key={section.name} style={{ marginTop: "30px" }}>
            <h2>{section.name}</h2>
            <pre
              style={{
                whiteSpace: "pre-wrap",
                fontFamily: "Arial",
                lineHeight: "1.5",
              }}
            >
              {section.content}
            </pre>
          </section>
        ))}

      {data.disclaimer && (
        <p style={{ marginTop: "40px", fontSize: "12px", color: "gray" }}>
          {data.disclaimer}
        </p>
      )}
    </main>
  );
}