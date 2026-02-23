import type { PPCKeywordRow, AggregatedKeyword } from "@/types";
import { safeDiv } from "@/lib/utils/number-format";

/**
 * Aggregates multiple PPC report parsing results into unified keyword data.
 *
 * Groups rows by keyword (case-insensitive) + matchType, sums additive
 * metrics, and recalculates derived rates (acos, cpc, conversionRate)
 * from the summed totals to avoid the statistical error of averaging rates.
 */
export function aggregatePPCKeywords(
  reports: PPCKeywordRow[][],
): AggregatedKeyword[] {
  // 1. Flatten all reports into one array
  const allRows = reports.flat();

  // 2. Group by composite key: keyword (lowercase) | matchType
  const groups = new Map<string, PPCKeywordRow[]>();

  for (const row of allRows) {
    const key = `${row.keyword.toLowerCase()}|${row.matchType}`;
    const group = groups.get(key);
    if (group) {
      group.push(row);
    } else {
      groups.set(key, [row]);
    }
  }

  // 3. Aggregate each group
  const results: AggregatedKeyword[] = [];

  for (const rows of Array.from(groups.values())) {
    const campaignSet = new Set<string>();
    let maxBid = 0;
    let totalImpressions = 0;
    let totalClicks = 0;
    let totalSpend = 0;
    let totalSales = 0;
    let totalOrders = 0;

    for (const row of rows) {
      campaignSet.add(row.campaignName);
      if (row.bid > maxBid) maxBid = row.bid;
      totalImpressions += row.impressions;
      totalClicks += row.clicks;
      totalSpend += row.spend;
      totalSales += row.sales;
      totalOrders += row.orders;
    }

    results.push({
      keyword: rows[0].keyword, // preserve original casing from first occurrence
      matchType: rows[0].matchType,
      campaigns: Array.from(campaignSet),
      bid: maxBid,
      impressions: totalImpressions,
      clicks: totalClicks,
      spend: totalSpend,
      sales: totalSales,
      orders: totalOrders,
      // 4. Recalculate derived rates; handle division by zero via safeDiv
      acos: safeDiv(totalSpend, totalSales) * 100,
      cpc: safeDiv(totalSpend, totalClicks),
      conversionRate: safeDiv(totalOrders, totalClicks) * 100,
    });
  }

  // 5. Sort by spend descending
  results.sort((a, b) => b.spend - a.spend);

  return results;
}
