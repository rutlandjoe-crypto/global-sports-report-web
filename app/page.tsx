function getReportSections(report: JsonObject): any[] {
  // Case 1: already proper array
  if (Array.isArray(report.sections)) {
    return report.sections;
  }

  // Case 2: your current Python structure (object with keys)
  if (typeof report.sections === "object") {
    const mapped: any[] = [];

    for (const [key, value] of Object.entries(report.sections)) {
      if (!value) continue;

      // convert arrays into readable section cards
      if (Array.isArray(value)) {
        mapped.push({
          title: key.replace(/_/g, " ").toUpperCase(),
          headline: "",
          snapshot: "",
          key_storylines: value,
        });
      }
    }

    return mapped;
  }

  return [];
}