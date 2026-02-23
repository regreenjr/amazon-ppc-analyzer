import type { SQPWeeklyRow, SQPAggregatedQuery } from "@/types";
import { safeDiv } from "@/lib/utils/number-format";

type TrendDirection = "declining" | "stable" | "growing";

/**
 * Determines a trend direction from an ordered series of numeric values.
 *
 * Requires at least 3 data points. If every consecutive value is strictly
 * increasing the trend is "growing"; if strictly decreasing, "declining";
 * otherwise "stable".
 */
function detectTrend(values: number[]): TrendDirection {
  if (values.length < 3) return "stable";

  // Check the last 3+ values
  let allGrowing = true;
  let allDeclining = true;

  for (let i = 1; i < values.length; i++) {
    if (values[i] >= values[i - 1]) allDeclining = false;
    if (values[i] <= values[i - 1]) allGrowing = false;
  }

  if (allGrowing) return "growing";
  if (allDeclining) return "declining";
  return "stable";
}

/**
 * Aggregates multiple SQP weekly reports into trend data.
 *
 * Groups rows by searchQuery (case-insensitive) + asin, calculates
 * averages for share metrics, and detects trend direction from the
 * chronologically sorted weekly series.
 */
export function aggregateSQPQueries(
  reports: SQPWeeklyRow[][],
): SQPAggregatedQuery[] {
  // 1. Flatten all reports
  const allRows = reports.flat();

  // 2. Group by composite key: searchQuery (lowercase) | asin
  const groups = new Map<string, SQPWeeklyRow[]>();

  for (const row of allRows) {
    const key = `${row.searchQuery.toLowerCase()}|${row.asin}`;
    const group = groups.get(key);
    if (group) {
      group.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  // 3. Aggregate each group
  const results: SQPAggregatedQuery[] = [];

  for (const rows of Array.from(groups.values())) {
    // Sort weeks chronologically (string comparison works for date strings)
    const sortedWeeks = rows.slice().sort((a: SQPWeeklyRow, b: SQPWeeklyRow) =>
      a.reportingWeek.localeCompare(b.reportingWeek),
    );

    const count = sortedWeeks.length;

    // Calculate averages using safeDiv to guard against empty arrays
    let totalSearchVolume = 0;
    let totalClickShareAsin = 0;
    let totalPurchaseShareAsin = 0;
    let totalClickToPurchaseTotal = 0;
    let totalClickToPurchaseAsin = 0;

    for (const week of sortedWeeks) {
      totalSearchVolume += week.searchQueryVolume;
      totalClickShareAsin += week.clickShareAsin;
      totalPurchaseShareAsin += week.purchaseShareAsin;
      totalClickToPurchaseTotal += week.clickToPurchaseTotal;
      totalClickToPurchaseAsin += week.clickToPurchaseAsin;
    }

    // Detect trends from the chronologically sorted weekly values
    const clickShareValues = sortedWeeks.map((w: SQPWeeklyRow) => w.clickShareAsin);
    const purchaseShareValues = sortedWeeks.map((w: SQPWeeklyRow) => w.purchaseShareAsin);

    results.push({
      searchQuery: sortedWeeks[0].searchQuery, // preserve original casing
      asin: sortedWeeks[0].asin,
      weeks: sortedWeeks,
      avgSearchVolume: safeDiv(totalSearchVolume, count),
      avgClickShareAsin: safeDiv(totalClickShareAsin, count),
      avgPurchaseShareAsin: safeDiv(totalPurchaseShareAsin, count),
      avgClickToPurchaseTotal: safeDiv(totalClickToPurchaseTotal, count),
      avgClickToPurchaseAsin: safeDiv(totalClickToPurchaseAsin, count),
      clickShareTrend: detectTrend(clickShareValues),
      purchaseShareTrend: detectTrend(purchaseShareValues),
    });
  }

  // 4. Sort by avgSearchVolume descending
  results.sort((a, b) => b.avgSearchVolume - a.avgSearchVolume);

  return results;
}
