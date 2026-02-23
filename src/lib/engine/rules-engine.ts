import {
  AggregatedKeyword,
  SQPAggregatedQuery,
  AnalysisSettings,
  AnalysisResult,
  Recommendation,
  ActionType,
} from "@/types";
import { checkDataSufficiency } from "./rules/data-sufficiency";
import { evaluateACOS } from "./rules/acos-performance";
import { checkAdOpportunity } from "./rules/ad-opportunity";
import { detectTrends } from "./rules/trend-flags";

/**
 * Main analysis engine. Combines PPC keyword data and SQP search query data
 * to produce actionable recommendations.
 *
 * Steps:
 * 1. Index PPC keywords and SQP queries by lowercase keyword/query
 * 2. Union all unique keywords from both sources
 * 3. Apply rules in priority order: data sufficiency -> ACOS -> opportunity -> trends
 * 4. Build summary counts and sort recommendations
 */
export function runAnalysis(
  ppcKeywords: AggregatedKeyword[],
  sqpQueries: SQPAggregatedQuery[],
  settings: AnalysisSettings
): AnalysisResult {
  // 1. Build lookup maps
  const ppcMap = new Map<string, AggregatedKeyword>();
  for (const kw of ppcKeywords) {
    ppcMap.set(kw.keyword.toLowerCase(), kw);
  }

  const sqpMap = new Map<string, SQPAggregatedQuery>();
  for (const q of sqpQueries) {
    sqpMap.set(q.searchQuery.toLowerCase(), q);
  }

  // 2. Collect all unique keywords from both sources
  const allKeywords = new Set<string>(
    Array.from(ppcMap.keys()).concat(Array.from(sqpMap.keys()))
  );

  // 3. Process each keyword
  const recommendations: Recommendation[] = [];

  for (const keywordLower of Array.from(allKeywords)) {
    const ppc = ppcMap.get(keywordLower) ?? null;
    const sqp = sqpMap.get(keywordLower) ?? null;

    const rec = buildRecommendation(ppc, sqp, ppcMap, settings);
    recommendations.push(rec);
  }

  // 4. Sort: by spend desc (PPC keywords first), then search volume desc (SQP-only)
  recommendations.sort((a, b) => {
    // PPC keywords with spend come first
    const spendA = a.spend ?? 0;
    const spendB = b.spend ?? 0;
    if (spendA !== spendB) return spendB - spendA;

    // Then by search volume desc
    const volA = a.avgSearchVolume ?? 0;
    const volB = b.avgSearchVolume ?? 0;
    return volB - volA;
  });

  // 5. Build summary counts
  const summary = buildSummary(recommendations);

  return {
    recommendations,
    summary,
    totalKeywords: allKeywords.size,
    analyzedAt: new Date(),
  };
}

/**
 * Builds a single Recommendation for a keyword, combining PPC and SQP data.
 */
function buildRecommendation(
  ppc: AggregatedKeyword | null,
  sqp: SQPAggregatedQuery | null,
  ppcMap: Map<string, AggregatedKeyword>,
  settings: AnalysisSettings
): Recommendation {
  let action: ActionType = "NO_CHANGE";
  let suggestedBid: number | null = null;
  let reason = "";
  let trendFlags: ActionType[] = [];

  const source: "ppc" | "sqp" | "both" =
    ppc && sqp ? "both" : ppc ? "ppc" : "sqp";

  // --- PPC analysis ---
  if (ppc) {
    const insufficiency = checkDataSufficiency(ppc, settings);
    if (insufficiency) {
      action = insufficiency.action!;
      reason = insufficiency.reason!;
    } else {
      const acosResult = evaluateACOS(ppc, settings);
      action = acosResult.action;
      suggestedBid = acosResult.suggestedBid;
      reason = acosResult.reason;
    }
  }

  // --- SQP analysis ---
  if (sqp) {
    // Check ad opportunity only if no PPC data
    if (!ppc) {
      const opportunity = checkAdOpportunity(sqp, ppcMap);
      if (opportunity.isOpportunity) {
        action = "START_ADS";
        reason = opportunity.reason;
      } else {
        // SQP-only keyword that isn't an opportunity
        action = "NO_CHANGE";
        reason = opportunity.reason;
      }
    }

    // Detect trends regardless of PPC presence
    trendFlags = detectTrends(sqp);
  }

  // --- Build full Recommendation ---
  return {
    keyword: ppc?.keyword ?? sqp?.searchQuery ?? "",
    matchType: ppc?.matchType ?? "Exact",
    campaigns: ppc?.campaigns ?? [],
    action,
    trendFlags,
    // PPC data
    currentAcos: ppc?.acos ?? null,
    currentBid: ppc?.bid ?? null,
    suggestedBid,
    clicks: ppc?.clicks ?? null,
    spend: ppc?.spend ?? null,
    sales: ppc?.sales ?? null,
    orders: ppc?.orders ?? null,
    conversionRate: ppc?.conversionRate ?? null,
    // SQP data
    avgSearchVolume: sqp?.avgSearchVolume ?? null,
    avgClickShareAsin: sqp?.avgClickShareAsin ?? null,
    avgPurchaseShareAsin: sqp?.avgPurchaseShareAsin ?? null,
    clickToPurchaseAsin: sqp?.avgClickToPurchaseAsin ?? null,
    clickToPurchaseTotal: sqp?.avgClickToPurchaseTotal ?? null,
    // Explanation
    reason,
    source,
  };
}

/**
 * Counts each ActionType across all recommendations, including trend flags.
 */
function buildSummary(
  recommendations: Recommendation[]
): Record<ActionType, number> {
  const summary: Record<ActionType, number> = {
    INCREASE_BID: 0,
    LOWER_BID: 0,
    NEGATE: 0,
    NO_CHANGE: 0,
    INSUFFICIENT_DATA: 0,
    START_ADS: 0,
    REVIEW_PREVIEW: 0,
    REVIEW_DETAIL_PAGE: 0,
  };

  for (const rec of recommendations) {
    summary[rec.action]++;

    // Count trend flags separately
    for (const flag of rec.trendFlags) {
      summary[flag]++;
    }
  }

  return summary;
}
