"use client";

import { FileUploadSection } from "@/components/file-upload/FileUploadSection";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { AnalyzeButton } from "@/components/AnalyzeButton";
import { SummaryCards } from "@/components/results/SummaryCards";
import { Toolbar } from "@/components/results/Toolbar";
import { ResultsTable } from "@/components/results/ResultsTable";
import { useAppStore } from "@/store/app-store";

export default function Home() {
  const results = useAppStore((s) => s.results);

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
            <Toolbar />
            <ResultsTable />
          </div>
        )}
      </div>
    </main>
  );
}
