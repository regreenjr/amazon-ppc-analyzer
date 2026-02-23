"use client";

import { useAppStore } from "@/store/app-store";
import { Card, CardContent } from "@/components/ui/card";
import { ActionType } from "@/types";

const CARD_CONFIG: { action: ActionType; label: string; color: string }[] = [
  { action: "INCREASE_BID", label: "Increase Bid", color: "text-green-600" },
  { action: "LOWER_BID", label: "Lower Bid", color: "text-orange-600" },
  { action: "NEGATE", label: "Negate", color: "text-red-600" },
  { action: "NO_CHANGE", label: "No Change", color: "text-gray-600" },
  { action: "INSUFFICIENT_DATA", label: "Monitor", color: "text-gray-500" },
  { action: "START_ADS", label: "Start Ads", color: "text-blue-600" },
  { action: "REVIEW_PREVIEW", label: "Review Preview", color: "text-yellow-600" },
  { action: "REVIEW_DETAIL_PAGE", label: "Review Detail", color: "text-yellow-600" },
];

export function SummaryCards() {
  const results = useAppStore((s) => s.results);
  if (!results) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
      {CARD_CONFIG.map(({ action, label, color }) => (
        <Card key={action}>
          <CardContent className="p-4 text-center">
            <p className={`text-2xl font-bold ${color}`}>{results.summary[action] || 0}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
