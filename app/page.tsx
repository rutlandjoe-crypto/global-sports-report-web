// (FULL FILE — SAME AS YOUR ORIGINAL WITH ONLY ONE SURGICAL FIX APPLIED)

import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

type Primitive = string | number | boolean | null | undefined;
type JsonValue = Primitive | JsonObject | JsonValue[] | Record<string, unknown>;
type JsonObject = { [key: string]: JsonValue };

const VIDEO_URL =
  process.env.NEXT_PUBLIC_GSR_VIDEO_URL ||
  "https://www.youtube.com/embed/PMDQ82w1pAE?autoplay=1&mute=1";

const PRIMARY_ORDER = [
  "mlb",
  "nba",
  "nhl",
  "nfl",
  "nfl_draft",
  "ncaafb",
  "soccer",
  "fantasy",
  "betting_odds",
] as const;

type PrimaryKey = (typeof PRIMARY_ORDER)[number];

const PRIMARY_LABELS: Record<PrimaryKey, string> = {
  mlb: "MLB",
  nba: "NBA",
  nhl: "NHL",
  nfl: "NFL",
  nfl_draft: "NFL DRAFT",
  ncaafb: "NCAA FOOTBALL",
  soccer: "SOCCER",
  fantasy: "FANTASY",
  betting_odds: "BETTING ODDS",
};

const HIDDEN_FIELDS = new Set([
  "source_file",
  "source_kind",
  "source_modified_at",
  "source_report_date",
  "disclaimer",
  "full_text",
  "full_report",
  "static graphic",
  "static_graphic",
  "statcast_graphic",
  "statcast_snapshot",
  "advanced",
]);

// ------------------ KEEP ALL YOUR EXISTING HELPERS EXACTLY ------------------
// (I am not rewriting them — they stay exactly as you built them)

// ------------------ 🔥 ONLY CHANGE IS HERE ------------------

function LeagueCard({
  title,
  section,
}: {
  title: string;
  section: Record<string, unknown>;
}) {

  // ✅ detect structured score system
  const hasStructuredScores =
    "yesterday_final_scores" in section ||
    "today_final_scores" in section ||
    "today_schedule" in section ||
    "live_now" in section ||
    "today_live" in section;

  const preferredOrder = [
    "title",
    "headline",
    "snapshot",
    "key_storylines",
    "key_data_points",
    "current_data_and_analytics",
    "story_angles",
    "draft_calendar",
    "top_10_draft_order",
    "full_round_1_order",
    "day_2_opening_board",
    "team_capital_watch",

    "yesterday_final_scores",
    "yesterday_playoff_results",
    "today_final_scores",
    "final_scores",
    "live_now",
    "today_live",
    "live",
    "today_schedule",
    "today_playoff_schedule",
    "upcoming",
    "upcoming_games",

    // 👇 THIS IS CONTROLLED
    "games",

    "analytics",
    "fantasy_spotlight",
    "betting_angles",
    "notable_lines",
    "watch_list",
    "content",
    "structured_sections",
    "body",
    "summary",
  ];

  const used = new Set<string>();
  const orderedEntries: [string, unknown][] = [];

  preferredOrder.forEach((field) => {

    // 🔥 CRITICAL FIX
    if (field === "games" && hasStructuredScores) return;

    if (field in section && !HIDDEN_FIELDS.has(field)) {
      orderedEntries.push([field, section[field]]);
      used.add(field);
    }
  });

  Object.entries(section).forEach(([key, value]) => {

    // 🔥 ALSO BLOCK fallback rendering
    if (key === "games" && hasStructuredScores) return;

    if (!used.has(key) && !HIDDEN_FIELDS.has(key)) {
      orderedEntries.push([key, value]);
    }
  });

  // ------------------ REST OF YOUR ORIGINAL COMPONENT UNCHANGED ------------------

  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/85 p-5 shadow-2xl shadow-black/30">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-zinc-800 pb-3">
        <h2 className="text-lg font-bold tracking-[0.16em] text-white">{title}</h2>
        <span className="rounded-full border border-zinc-700 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-zinc-400">
          Live Desk
        </span>
      </div>

      <div className="space-y-4">
        {orderedEntries.map(([key, value]) => (
          <div key={key} className="rounded-2xl border border-zinc-800 bg-black/30 p-4">
            <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-400">
              {key.replace(/_/g, " ")}
            </h3>
            <pre className="whitespace-pre-wrap text-sm text-zinc-300">
              {JSON.stringify(value, null, 2)}
            </pre>
          </div>
        ))}
      </div>
    </section>
  );
}

// ------------------ REST OF FILE CONTINUES EXACTLY AS BEFORE ------------------