"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/app-store";
import { computeWASPReport } from "@/lib/wasp/wasp-report";
import { exportWASPToCSV } from "@/lib/export/wasp-export";
import { fmtCurrency, fmtPct } from "@/lib/utils/number-format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WASPCategory } from "@/types";

const SEVERITY_STYLES: Record<WASPCategory["severity"], { variant: "destructive" | "default" | "secondary"; label: string }> = {
  high: { variant: "destructive", label: "High" },
  medium: { variant: "default", label: "Medium" },
  low: { variant: "secondary", label: "Low" },
};

export function WASPReport() {
  const results = useAppStore((s) => s.results);
  const settings = useAppStore((s) => s.settings);

  const report = useMemo(() => {
    if (!results) return null;
    return computeWASPReport(results.recommendations, settings);
  }, [results, settings]);

  if (!report) return null;

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Ad Spend</p>
              <p className="text-2xl font-bold">{fmtCurrency(report.totalAdSpend)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estimated Wasted Spend</p>
              <p className="text-2xl font-bold text-red-600">
                {fmtCurrency(report.totalWastedSpend)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Waste Percentage</p>
              <p className="text-2xl font-bold text-red-600">
                {fmtPct(report.wastePercentage)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category cards */}
      {report.categories.map((cat) => {
        const style = SEVERITY_STYLES[cat.severity];
        return (
          <Card key={cat.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{cat.label}</CardTitle>
                <Badge variant={style.variant}>{style.label}</Badge>
              </div>
              <CardDescription>{cat.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-muted-foreground">Keywords</p>
                  <p className="text-xl font-semibold">{cat.keywordCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Spend</p>
                  <p className="text-xl font-semibold">{fmtCurrency(cat.totalSpend)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Waste</p>
                  <p className="text-xl font-semibold text-red-600">
                    {fmtCurrency(cat.estimatedWaste)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Download button */}
      <div className="flex justify-center">
        <Button onClick={() => exportWASPToCSV(report)} variant="outline">
          Download WASP Report
        </Button>
      </div>
    </div>
  );
}
