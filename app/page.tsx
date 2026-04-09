import fs from "fs";
import path from "path";

function cleanText(text: string) {
  return text
    .replace(/â€™/g, "’")
    .replace(/â€˜/g, "‘")
    .replace(/â€œ/g, "“")
    .replace(/â€\x9d/g, "”")
    .replace(/â€/g, "”")
    .replace(/â€”/g, "—")
    .replace(/â€“/g, "–")
    .replace(/â€¢/g, "•");
}

function getReportText() {
  const reportPath = path.join(
    process.cwd(),
    "public",
    "global_sports_report.txt"
  );

  try {
    if (fs.existsSync(reportPath)) {
      return cleanText(fs.readFileSync(reportPath, "utf8"));
    }
  } catch {}

  return `GLOBAL SPORTS REPORT | DEMO

This report is an automated summary intended to support, not replace, human sports journalism.

MLB
• Daily MLB coverage will appear here.

NBA
• Daily NBA coverage will appear here.

NHL
• Daily NHL coverage will appear here.

SOCCER
• Daily soccer coverage will appear here.`;
}

export default function HomePage() {
  let report = getReportText();

  report = report.replace(
    "This report is an automated summary intended to support, not replace, human sports journalism.",
    ""
  ).trim();

  const today = new Date().toLocaleDateString("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const colors = {
    background: "#ffffff",
    text: "#000000",
    subtext: "#333333",
    border: "#d0d0d0",
    headline: "#b30000",
    link: "#0000cc",
  };

  return (
    <main
      style={{
        backgroundColor: colors.background,
        color: colors.text,
        minHeight: "100vh",
        fontFamily: "Arial, Helvetica, sans-serif",
        padding: "24px 16px 40px",
      }}
    >
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <img
            src="/logo.png"
            alt="GSR Logo"
            style={{ width: "56px", height: "56px" }}
          />

          <div>
            <h1 style={{ margin: 0, fontSize: "2.6rem", fontWeight: 900 }}>
              Global Sports Report
            </h1>

            <p
              style={{
                margin: "6px 0 0 0",
                fontSize: "1.05rem",
                color: colors.subtext,
              }}
            >
              A daily, structured sports wire built for fast scanning across
              leagues, results, and storylines.
            </p>
          </div>
        </header>

        <section
          style={{
            border: `1px solid ${colors.border}`,
            padding: "20px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              color: colors.headline,
              fontWeight: 900,
              marginBottom: "8px",
            }}
          >
            TOP STORY
          </div>

          <div
            style={{
              color: colors.headline,
              fontSize: "1.9rem",
              fontWeight: 900,
            }}
          >
            Today’s sports landscape is organized for speed, structure, and clarity.
          </div>

          <div style={{ marginTop: "8px", color: colors.subtext }}>{today}</div>
        </section>

        <section
          style={{
            border: `1px solid ${colors.border}`,
            padding: "20px",
          }}
        >
          <div style={{ fontWeight: 900, marginBottom: "10px" }}>
            Daily Report
          </div>

          <pre
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "Courier New, monospace",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {report}
          </pre>
        </section>

        <footer style={{ marginTop: "20px", color: colors.subtext }}>
          This report is an automated summary intended to support, not replace,
          human sports journalism.
        </footer>
      </div>
    </main>
  );
}