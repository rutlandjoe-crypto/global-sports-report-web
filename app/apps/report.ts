import fs from "fs";
import path from "path";

export type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function readSportsReport(): JsonObject {
  try {
    const reportPath = path.join(process.cwd(), "public", "latest_report.json");
    return JSON.parse(fs.readFileSync(reportPath, "utf8")) as JsonObject;
  } catch {
    return {};
  }
}

export function freshestLeagueUpdate(
  report: JsonObject,
  leagueKey: string
): string {
  const league = object(object(report.sections)[leagueKey]);
  const raw =
    text(league.updated_at) ||
    text(league.generated_at) ||
    text(league.published_at) ||
    text(report.updated_at) ||
    text(report.generated_at) ||
    text(report.published_at);

  return raw.replace(/\bEST\b|\bEDT\b/i, "ET");
}
