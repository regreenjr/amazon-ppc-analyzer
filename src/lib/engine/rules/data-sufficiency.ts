import { AggregatedKeyword, AnalysisSettings, Recommendation } from "@/types";

/**
 * Returns a partial Recommendation if data is insufficient, null otherwise.
 * A keyword is considered data-insufficient when its click count is below
 * the configured clickThreshold in settings.
 */
export function checkDataSufficiency(
  kw: AggregatedKeyword,
  settings: AnalysisSettings
): Partial<Recommendation> | null {
  if (kw.clicks < settings.clickThreshold) {
    return {
      action: "INSUFFICIENT_DATA",
      reason: `Only ${kw.clicks} clicks (threshold: ${settings.clickThreshold}). Need more data.`,
    };
  }
  return null;
}
