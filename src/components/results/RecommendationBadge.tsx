"use client";

import { Badge } from "@/components/ui/badge";
import { ActionType } from "@/types";
import { cn } from "@/lib/utils";

const ACTION_STYLES: Record<ActionType, { label: string; className: string }> = {
  INCREASE_BID: { label: "Increase Bid", className: "bg-green-100 text-green-800 border-green-200" },
  LOWER_BID: { label: "Lower Bid", className: "bg-orange-100 text-orange-800 border-orange-200" },
  NEGATE: { label: "Negate", className: "bg-red-100 text-red-800 border-red-200" },
  NO_CHANGE: { label: "No Change", className: "bg-gray-100 text-gray-800 border-gray-200" },
  INSUFFICIENT_DATA: { label: "Monitor", className: "bg-gray-100 text-gray-600 border-gray-200" },
  START_ADS: { label: "Start Ads", className: "bg-blue-100 text-blue-800 border-blue-200" },
  REVIEW_PREVIEW: { label: "Review Preview", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  REVIEW_DETAIL_PAGE: { label: "Review Detail Page", className: "bg-yellow-100 text-yellow-800 border-yellow-200" },
};

export function RecommendationBadge({ action }: { action: ActionType }) {
  const style = ACTION_STYLES[action];
  return (
    <Badge variant="outline" className={cn("font-medium", style.className)}>
      {style.label}
    </Badge>
  );
}

export { ACTION_STYLES };
