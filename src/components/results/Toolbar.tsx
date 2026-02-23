"use client";

import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { ActionType } from "@/types";
import { exportToCSV } from "@/lib/export/csv-export";

const FILTER_OPTIONS: { value: ActionType | "ALL"; label: string }[] = [
  { value: "ALL", label: "All Actions" },
  { value: "INCREASE_BID", label: "Increase Bid" },
  { value: "LOWER_BID", label: "Lower Bid" },
  { value: "NEGATE", label: "Negate" },
  { value: "NO_CHANGE", label: "No Change" },
  { value: "INSUFFICIENT_DATA", label: "Monitor" },
  { value: "START_ADS", label: "Start Ads" },
  { value: "REVIEW_PREVIEW", label: "Review Preview" },
  { value: "REVIEW_DETAIL_PAGE", label: "Review Detail Page" },
];

export function Toolbar() {
  const results = useAppStore((s) => s.results);
  const activeFilter = useAppStore((s) => s.activeFilter);
  const setActiveFilter = useAppStore((s) => s.setActiveFilter);

  if (!results) return null;

  return (
    <div className="flex items-center justify-between gap-4">
      <Select
        value={activeFilter}
        onChange={(e) => setActiveFilter(e.target.value as ActionType | "ALL")}
        className="w-48"
      >
        {FILTER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </Select>
      <Button
        variant="outline"
        onClick={() => exportToCSV(results.recommendations)}
      >
        Export CSV
      </Button>
    </div>
  );
}
