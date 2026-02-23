// === PPC Report Types ===

export interface PPCKeywordRow {
  campaignName: string;
  adGroupName: string;
  keyword: string;
  matchType: "Broad" | "Phrase" | "Exact";
  state: string;
  bid: number;
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  acos: number; // 0-100 percentage
  cpc: number;
  conversionRate: number; // 0-100 percentage
}

export interface AggregatedKeyword {
  keyword: string;
  matchType: "Broad" | "Phrase" | "Exact";
  campaigns: string[];
  bid: number; // latest/max bid across reports
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  orders: number;
  acos: number;
  cpc: number;
  conversionRate: number;
}

// === SQP Report Types ===

export interface SQPWeeklyRow {
  searchQuery: string;
  searchQueryVolume: number;
  searchQueryScore: number;
  // Click share
  clickShareTotal: number;
  clickShareAsin: number;
  // Cart add share
  cartAddShareTotal: number;
  cartAddShareAsin: number;
  // Purchase share
  purchaseShareTotal: number;
  purchaseShareAsin: number;
  // Conversion rates (derived)
  clickToCartTotal: number;
  clickToCartAsin: number;
  clickToPurchaseTotal: number;
  clickToPurchaseAsin: number;
  // Report metadata
  reportingWeek: string;
  asin: string;
}

export interface SQPAggregatedQuery {
  searchQuery: string;
  asin: string;
  weeks: SQPWeeklyRow[]; // chronologically sorted
  avgSearchVolume: number;
  avgClickShareAsin: number;
  avgPurchaseShareAsin: number;
  avgClickToPurchaseTotal: number;
  avgClickToPurchaseAsin: number;
  // Trend flags
  clickShareTrend: "declining" | "stable" | "growing";
  purchaseShareTrend: "declining" | "stable" | "growing";
}

// === Analysis Types ===

export type ActionType =
  | "INCREASE_BID"
  | "LOWER_BID"
  | "NEGATE"
  | "NO_CHANGE"
  | "INSUFFICIENT_DATA"
  | "START_ADS"
  | "REVIEW_PREVIEW"
  | "REVIEW_DETAIL_PAGE";

export interface Recommendation {
  keyword: string;
  matchType: string;
  campaigns: string[];
  action: ActionType;
  // Trend flags (additive)
  trendFlags: ActionType[];
  // PPC data
  currentAcos: number | null;
  currentBid: number | null;
  suggestedBid: number | null;
  clicks: number | null;
  spend: number | null;
  sales: number | null;
  orders: number | null;
  conversionRate: number | null;
  // SQP data
  avgSearchVolume: number | null;
  avgClickShareAsin: number | null;
  avgPurchaseShareAsin: number | null;
  clickToPurchaseAsin: number | null;
  clickToPurchaseTotal: number | null;
  // Organic ranking data
  organicRank: number | null;
  organicSearchVolume: number | null;
  // Explanation
  reason: string;
  source: "ppc" | "sqp" | "both";
}

export interface AnalysisSettings {
  acosTarget: number; // percentage, e.g. 25
  acosThreshold: number; // percentage, e.g. 40
  clickThreshold: number; // minimum clicks for data sufficiency
}

export interface AnalysisResult {
  recommendations: Recommendation[];
  summary: Record<ActionType, number>;
  totalKeywords: number;
  analyzedAt: Date;
}

// === Organic Ranking Types ===

export interface OrganicRankRow {
  searchTerm: string;
  medianRank: number | null;
  searchVolume: number;
  latestRank: number | null;
}

// === WASP Report Types ===

export interface WASPCategory {
  id: string;
  label: string;
  description: string;
  keywordCount: number;
  totalSpend: number;
  estimatedWaste: number;
  severity: "high" | "medium" | "low";
}

export interface WASPReport {
  categories: WASPCategory[];
  totalWastedSpend: number;
  totalAdSpend: number;
  wastePercentage: number;
}

// === File Upload Types ===

export interface UploadedFile {
  id: string;
  name: string;
  type: "ppc" | "sqp" | "organic";
  file: File;
  parsedAt?: Date;
}
