"use client";

import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";
import { parsePPCReport } from "@/lib/parsers/ppc-parser";
import { parseSQPReport } from "@/lib/parsers/sqp-parser";
import { parseOrganicXlsx, parseOrganicCsv } from "@/lib/parsers/organic-parser";
import { aggregatePPCKeywords } from "@/lib/aggregator/ppc-aggregator";
import { aggregateSQPQueries } from "@/lib/aggregator/sqp-aggregator";
import { runAnalysis } from "@/lib/engine/rules-engine";
import type { OrganicRankRow } from "@/types";

export function AnalyzeButton() {
  const {
    ppcFiles,
    sqpFiles,
    organicFiles,
    settings,
    isAnalyzing,
    setIsAnalyzing,
    setPPCReports,
    setSQPReports,
    setOrganicData,
    setAggregatedPPC,
    setAggregatedSQP,
    setResults,
  } = useAppStore();

  const hasFiles = ppcFiles.length > 0 || sqpFiles.length > 0;

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      // 1. Parse PPC reports
      const ppcReports = await Promise.all(
        ppcFiles.map(async (f) => {
          const buffer = await f.file.arrayBuffer();
          return parsePPCReport(buffer);
        })
      );
      setPPCReports(ppcReports);

      // 2. Parse SQP reports
      const sqpReports = await Promise.all(
        sqpFiles.map(async (f) => {
          const text = await f.file.text();
          return parseSQPReport(text);
        })
      );
      setSQPReports(sqpReports);

      // 3. Parse organic ranking files
      const organicRows: OrganicRankRow[] = [];
      for (const f of organicFiles) {
        const ext = f.name.split(".").pop()?.toLowerCase();
        if (ext === "xlsx") {
          const buffer = await f.file.arrayBuffer();
          const rows = await parseOrganicXlsx(buffer);
          organicRows.push(...rows);
        } else {
          const text = await f.file.text();
          const rows = await parseOrganicCsv(text);
          organicRows.push(...rows);
        }
      }
      setOrganicData(organicRows);

      // 4. Aggregate
      const aggPPC = aggregatePPCKeywords(ppcReports);
      setAggregatedPPC(aggPPC);

      const aggSQP = aggregateSQPQueries(sqpReports);
      setAggregatedSQP(aggSQP);

      // 5. Run analysis
      const results = runAnalysis(aggPPC, aggSQP, settings, organicRows);
      setResults(results);
    } catch (err) {
      console.error("Analysis failed:", err);
      alert(`Analysis failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <Button
      size="lg"
      disabled={!hasFiles || isAnalyzing}
      onClick={handleAnalyze}
      className="w-full sm:w-auto"
    >
      {isAnalyzing ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Analyzing...
        </span>
      ) : (
        "Analyze Keywords"
      )}
    </Button>
  );
}
