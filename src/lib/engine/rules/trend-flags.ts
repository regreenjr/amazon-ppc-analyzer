import { SQPAggregatedQuery, ActionType } from "@/types";

/**
 * Detects declining trends in SQP weekly data and returns additive action flags.
 *
 * Checks for 3+ consecutive weeks of strictly declining values:
 * - Declining clickShareAsin -> REVIEW_PREVIEW (ad preview/title issue)
 * - Declining purchaseShareAsin -> REVIEW_DETAIL_PAGE (listing/detail page issue)
 *
 * "Strictly declining" means each week's value is strictly less than
 * the previous week's value.
 */
export function detectTrends(sqp: SQPAggregatedQuery): ActionType[] {
  const flags: ActionType[] = [];
  const weeks = sqp.weeks;

  if (weeks.length < 3) {
    return flags;
  }

  if (hasConsecutiveDecline(weeks.map((w) => w.clickShareAsin))) {
    flags.push("REVIEW_PREVIEW");
  }

  if (hasConsecutiveDecline(weeks.map((w) => w.purchaseShareAsin))) {
    flags.push("REVIEW_DETAIL_PAGE");
  }

  return flags;
}

/**
 * Returns true if the values array contains 3 or more consecutive
 * strictly declining values at any point.
 */
function hasConsecutiveDecline(values: number[]): boolean {
  if (values.length < 3) return false;

  let consecutiveDeclines = 0;

  for (let i = 1; i < values.length; i++) {
    if (values[i] < values[i - 1]) {
      consecutiveDeclines++;
      // 2 consecutive declines means 3 points are strictly declining
      if (consecutiveDeclines >= 2) {
        return true;
      }
    } else {
      consecutiveDeclines = 0;
    }
  }

  return false;
}
