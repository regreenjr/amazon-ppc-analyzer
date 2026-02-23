import { SQPAggregatedQuery, AggregatedKeyword } from "@/types";

interface AdOpportunityResult {
  isOpportunity: boolean;
  reason: string;
}

/**
 * Checks whether an SQP search query represents an advertising opportunity.
 *
 * A query is an opportunity when:
 * 1. It does NOT currently have an active PPC keyword, AND
 * 2. The ASIN's click-to-purchase rate exceeds the overall market rate
 *    (meaning the product converts better than average for this query)
 */
export function checkAdOpportunity(
  sqp: SQPAggregatedQuery,
  ppcKeywords: Map<string, AggregatedKeyword>
): AdOpportunityResult {
  const queryLower = sqp.searchQuery.toLowerCase();
  const hasActiveAds = ppcKeywords.has(queryLower);

  if (
    !hasActiveAds &&
    sqp.avgClickToPurchaseAsin > sqp.avgClickToPurchaseTotal
  ) {
    return {
      isOpportunity: true,
      reason:
        `No active ads. ASIN conversion (${sqp.avgClickToPurchaseAsin.toFixed(1)}%) ` +
        `exceeds market (${sqp.avgClickToPurchaseTotal.toFixed(1)}%).`,
    };
  }

  return {
    isOpportunity: false,
    reason: hasActiveAds
      ? "Already running ads for this query."
      : `ASIN conversion (${sqp.avgClickToPurchaseAsin.toFixed(1)}%) does not exceed market (${sqp.avgClickToPurchaseTotal.toFixed(1)}%).`,
  };
}
