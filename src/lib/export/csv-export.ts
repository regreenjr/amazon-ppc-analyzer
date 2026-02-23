import { Recommendation } from "@/types";
import { fmtPct, fmtCurrency } from "@/lib/utils/number-format";

const CSV_COLUMNS = [
  "Keyword",
  "Match Type",
  "Campaigns",
  "Action",
  "Trend Flags",
  "Current ACOS",
  "Current Bid",
  "Suggested Bid",
  "Clicks",
  "Spend",
  "Sales",
  "Orders",
  "Conv Rate",
  "Avg Search Volume",
  "Click Share (ASIN)",
  "Purchase Share (ASIN)",
  "Organic Rank",
  "Organic Search Vol",
  "Source",
  "Reason",
];

function escapeCSVField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatNullableNumber(value: number | null): string {
  if (value == null) return "";
  return String(value);
}

function recommendationToRow(rec: Recommendation): string[] {
  return [
    rec.keyword,
    rec.matchType,
    rec.campaigns.join("; "),
    rec.action,
    rec.trendFlags.join("; "),
    fmtPct(rec.currentAcos),
    fmtCurrency(rec.currentBid),
    fmtCurrency(rec.suggestedBid),
    formatNullableNumber(rec.clicks),
    fmtCurrency(rec.spend),
    fmtCurrency(rec.sales),
    formatNullableNumber(rec.orders),
    fmtPct(rec.conversionRate),
    formatNullableNumber(rec.avgSearchVolume),
    fmtPct(rec.avgClickShareAsin),
    fmtPct(rec.avgPurchaseShareAsin),
    formatNullableNumber(rec.organicRank),
    formatNullableNumber(rec.organicSearchVolume),
    rec.source,
    rec.reason,
  ];
}

export function exportToCSV(recommendations: Recommendation[]): void {
  const headerRow = CSV_COLUMNS.map(escapeCSVField).join(",");

  const dataRows = recommendations.map((rec) =>
    recommendationToRow(rec).map(escapeCSVField).join(",")
  );

  const csvContent = [headerRow, ...dataRows].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const filename = `ppc-analysis-${date}.csv`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
