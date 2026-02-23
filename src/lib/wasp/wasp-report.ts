import { Recommendation, AnalysisSettings, WASPCategory, WASPReport } from "@/types";

export function computeWASPReport(
  recs: Recommendation[],
  settings: AnalysisSettings
): WASPReport {
  const totalAdSpend = recs.reduce((sum, r) => sum + (r.spend ?? 0), 0);

  // 1. Zero-conversion spend: keywords with spend but zero orders
  const zeroConvRecs = recs.filter((r) => r.orders === 0 && (r.spend ?? 0) > 0);
  const zeroConvWaste = zeroConvRecs.reduce((sum, r) => sum + (r.spend ?? 0), 0);

  // 2. High-ACOS keywords: recs where action is LOWER_BID
  const highAcosRecs = recs.filter((r) => r.action === "LOWER_BID");
  const highAcosWaste = highAcosRecs.reduce((sum, r) => {
    const spend = r.spend ?? 0;
    const sales = r.sales ?? 0;
    const waste = spend - (sales * settings.acosTarget) / 100;
    return sum + Math.max(0, waste);
  }, 0);

  // 3. Organic cannibalization: keywords ranking top 3 organically with ad spend
  const organicRecs = recs.filter(
    (r) => r.organicRank != null && r.organicRank <= 3 && (r.spend ?? 0) > 0
  );
  const organicWaste = organicRecs.reduce((sum, r) => sum + (r.spend ?? 0), 0);

  const categories: WASPCategory[] = [
    {
      id: "zero-conversion",
      label: "Zero-Conversion Spend",
      description:
        "Keywords with ad spend but zero orders. Budget spent with no return.",
      keywordCount: zeroConvRecs.length,
      totalSpend: zeroConvRecs.reduce((sum, r) => sum + (r.spend ?? 0), 0),
      estimatedWaste: zeroConvWaste,
      severity: zeroConvWaste > 0 ? "high" : "low",
    },
    {
      id: "high-acos",
      label: "High-ACOS Keywords",
      description: `Keywords with ACOS above your ${settings.acosTarget}% target. Overspending relative to sales.`,
      keywordCount: highAcosRecs.length,
      totalSpend: highAcosRecs.reduce((sum, r) => sum + (r.spend ?? 0), 0),
      estimatedWaste: highAcosWaste,
      severity: highAcosWaste > 0 ? "medium" : "low",
    },
    {
      id: "organic-cannibalization",
      label: "Organic Cannibalization",
      description:
        "Keywords already ranking in the top 3 organically where ads are also running. You may be paying for clicks you'd get for free.",
      keywordCount: organicRecs.length,
      totalSpend: organicRecs.reduce((sum, r) => sum + (r.spend ?? 0), 0),
      estimatedWaste: organicWaste,
      severity: organicRecs.length > 0 ? "medium" : "low",
    },
  ];

  const totalWastedSpend =
    zeroConvWaste + highAcosWaste + organicWaste;

  const wastePercentage =
    totalAdSpend > 0 ? (totalWastedSpend / totalAdSpend) * 100 : 0;

  return {
    categories,
    totalWastedSpend,
    totalAdSpend,
    wastePercentage,
  };
}
