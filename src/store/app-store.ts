import { create } from "zustand";
import {
  UploadedFile,
  PPCKeywordRow,
  SQPWeeklyRow,
  AggregatedKeyword,
  SQPAggregatedQuery,
  AnalysisSettings,
  AnalysisResult,
  ActionType,
} from "@/types";

interface AppState {
  // File management
  ppcFiles: UploadedFile[];
  sqpFiles: UploadedFile[];
  addPPCFile: (file: UploadedFile) => void;
  addSQPFile: (file: UploadedFile) => void;
  removePPCFile: (id: string) => void;
  removeSQPFile: (id: string) => void;

  // Parsed data (intermediate)
  ppcReports: PPCKeywordRow[][];
  sqpReports: SQPWeeklyRow[][];
  setPPCReports: (reports: PPCKeywordRow[][]) => void;
  setSQPReports: (reports: SQPWeeklyRow[][]) => void;

  // Aggregated data
  aggregatedPPC: AggregatedKeyword[];
  aggregatedSQP: SQPAggregatedQuery[];
  setAggregatedPPC: (data: AggregatedKeyword[]) => void;
  setAggregatedSQP: (data: SQPAggregatedQuery[]) => void;

  // Settings
  settings: AnalysisSettings;
  updateSettings: (partial: Partial<AnalysisSettings>) => void;

  // Analysis results
  results: AnalysisResult | null;
  setResults: (results: AnalysisResult) => void;

  // UI state
  isAnalyzing: boolean;
  setIsAnalyzing: (v: boolean) => void;
  activeFilter: ActionType | "ALL";
  setActiveFilter: (filter: ActionType | "ALL") => void;

  // Reset
  reset: () => void;
}

const DEFAULT_SETTINGS: AnalysisSettings = {
  acosTarget: 25,
  acosThreshold: 40,
  clickThreshold: 10,
};

const initialState = {
  ppcFiles: [] as UploadedFile[],
  sqpFiles: [] as UploadedFile[],
  ppcReports: [] as PPCKeywordRow[][],
  sqpReports: [] as SQPWeeklyRow[][],
  aggregatedPPC: [] as AggregatedKeyword[],
  aggregatedSQP: [] as SQPAggregatedQuery[],
  settings: DEFAULT_SETTINGS,
  results: null as AnalysisResult | null,
  isAnalyzing: false,
  activeFilter: "ALL" as ActionType | "ALL",
};

export const useAppStore = create<AppState>()((set) => ({
  ...initialState,

  // File management
  addPPCFile: (file) =>
    set((state) => ({ ppcFiles: [...state.ppcFiles, file] })),
  addSQPFile: (file) =>
    set((state) => ({ sqpFiles: [...state.sqpFiles, file] })),
  removePPCFile: (id) =>
    set((state) => ({
      ppcFiles: state.ppcFiles.filter((f) => f.id !== id),
    })),
  removeSQPFile: (id) =>
    set((state) => ({
      sqpFiles: state.sqpFiles.filter((f) => f.id !== id),
    })),

  // Parsed data
  setPPCReports: (reports) => set({ ppcReports: reports }),
  setSQPReports: (reports) => set({ sqpReports: reports }),

  // Aggregated data
  setAggregatedPPC: (data) => set({ aggregatedPPC: data }),
  setAggregatedSQP: (data) => set({ aggregatedSQP: data }),

  // Settings
  updateSettings: (partial) =>
    set((state) => ({
      settings: { ...state.settings, ...partial },
    })),

  // Analysis results
  setResults: (results) => set({ results }),

  // UI state
  setIsAnalyzing: (v) => set({ isAnalyzing: v }),
  setActiveFilter: (filter) => set({ activeFilter: filter }),

  // Reset
  reset: () => set({ ...initialState, settings: { ...DEFAULT_SETTINGS } }),
}));
