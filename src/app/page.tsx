"use client";

import { useState } from "react";
import { FileUploadSection } from "@/components/file-upload/FileUploadSection";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { AnalyzeButton } from "@/components/AnalyzeButton";
import { SummaryCards } from "@/components/results/SummaryCards";
import { Toolbar } from "@/components/results/Toolbar";
import { ResultsTable } from "@/components/results/ResultsTable";
import { WASPReport } from "@/components/results/WASPReport";
import { useAppStore } from "@/store/app-store";
import { Button } from "@/components/ui/button";

export default function Home() {
  const results = useAppStore((s) => s.results);
  const [activeTab, setActiveTab] = useState<"keywords" | "wasp">("keywords");

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Amazon PPC Keyword Analyzer</h1>
          <p className="text-muted-foreground mt-1">
            Upload PPC bulk reports and SQP weekly data to get actionable keyword recommendations.
          </p>
        </div>

        <FileUploadSection />
        <SettingsPanel />

        <div className="flex justify-center">
          <AnalyzeButton />
        </div>

        {results && (
          <div className="space-y-4">
            <SummaryCards />

            <div className="flex gap-2">
              <Button
                variant={activeTab === "keywords" ? "default" : "outline"}
                onClick={() => setActiveTab("keywords")}
              >
                Keyword Recommendations
              </Button>
              <Button
                variant={activeTab === "wasp" ? "default" : "outline"}
                onClick={() => setActiveTab("wasp")}
              >
                WASP Report
              </Button>
            </div>

            {activeTab === "keywords" ? (
              <>
                <Toolbar />
                <ResultsTable />
              </>
            ) : (
              <WASPReport />
            )}
          </div>
        )}
      </div>
    </main>
  );
}
