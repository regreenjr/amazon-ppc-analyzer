import { AggregatedKeyword, AnalysisSettings, ActionType } from "@/types";
import { roundCents } from "@/lib/utils/number-format";

interface ACOSResult {
  action: ActionType;
  suggestedBid: number | null;
  reason: string;
}

/**
 * Evaluates ACOS performance for a keyword that has sufficient data.
 *
 * Decision logic:
 * 1. Clicks >= threshold AND orders === 0 -> NEGATE (no conversions)
 * 2. ACOS is 0 but orders > 0 (free clicks edge case) -> INCREASE_BID
 * 3. ACOS < acosTarget -> INCREASE_BID (room to grow)
 * 4. acosTarget <= ACOS <= acosThreshold -> NO_CHANGE (acceptable range)
 * 5. ACOS > acosThreshold -> LOWER_BID (too expensive)
 */
export function evaluateACOS(
  kw: AggregatedKeyword,
  settings: AnalysisSettings
): ACOSResult {
  // No conversions after enough clicks -> negate the keyword
  if (kw.orders === 0) {
    return {
      action: "NEGATE",
      suggestedBid: null,
      reason: `No conversions after ${kw.clicks} clicks. Consider negating.`,
    };
  }

  // Edge case: ACOS is 0 but orders > 0 (e.g. free/organic attributed clicks)
  if (kw.acos === 0 && kw.orders > 0) {
    return {
      action: "INCREASE_BID",
      suggestedBid: roundCents(kw.bid * 1.2),
      reason: `ACOS is 0% with ${kw.orders} orders. Increasing bid to capture more volume.`,
    };
  }

  // ACOS below target -> room to increase bid
  if (kw.acos < settings.acosTarget) {
    const suggestedBid = roundCents(kw.cpc * (settings.acosTarget / kw.acos));
    return {
      action: "INCREASE_BID",
      suggestedBid,
      reason: `ACOS ${kw.acos.toFixed(1)}% is below target ${settings.acosTarget}%. Room to increase bid.`,
    };
  }

  // ACOS within acceptable range
  if (kw.acos <= settings.acosThreshold) {
    return {
      action: "NO_CHANGE",
      suggestedBid: null,
      reason: `ACOS ${kw.acos.toFixed(1)}% within acceptable range (${settings.acosTarget}%-${settings.acosThreshold}%).`,
    };
  }

  // ACOS above threshold -> lower bid
  const suggestedBid = roundCents(kw.cpc * (settings.acosThreshold / kw.acos));
  return {
    action: "LOWER_BID",
    suggestedBid,
    reason: `ACOS ${kw.acos.toFixed(1)}% exceeds threshold ${settings.acosThreshold}%. Lower bid to reduce spend.`,
  };
}
