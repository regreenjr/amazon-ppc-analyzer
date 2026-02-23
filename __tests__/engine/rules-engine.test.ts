import { describe, it, expect } from "vitest";
import { runAnalysis } from "@/lib/engine/rules-engine";
import { AggregatedKeyword, SQPAggregatedQuery, AnalysisSettings } from "@/types";

const defaultSettings: AnalysisSettings = {
  acosTarget: 25,
  acosThreshold: 40,
  clickThreshold: 10,
};

function makeKW(overrides: Partial<AggregatedKeyword>): AggregatedKeyword {
  return {
    keyword: "test keyword",
    matchType: "Exact",
    campaigns: ["Campaign 1"],
    bid: 1.5,
    impressions: 1000,
    clicks: 100,
    spend: 50,
    sales: 200,
    orders: 20,
    acos: 25,
    cpc: 0.5,
    conversionRate: 20,
    ...overrides,
  };
}

function makeSQP(overrides: Partial<SQPAggregatedQuery>): SQPAggregatedQuery {
  return {
    searchQuery: "test keyword",
    asin: "B0TEST12345",
    weeks: [],
    avgSearchVolume: 5000,
    avgClickShareAsin: 10,
    avgPurchaseShareAsin: 15,
    avgClickToPurchaseTotal: 5,
    avgClickToPurchaseAsin: 8,
    clickShareTrend: "stable",
    purchaseShareTrend: "stable",
    ...overrides,
  };
}

describe("runAnalysis", () => {
  it("returns LOWER_BID for keyword with ACOS above threshold", () => {
    const kw = makeKW({
      keyword: "expensive keyword",
      clicks: 1172,
      orders: 50,
      spend: 821,
      sales: 1500,
      acos: 54.73, // above 40% threshold
      cpc: 0.7,
      bid: 1.0,
    });

    const result = runAnalysis([kw], [], defaultSettings);
    const rec = result.recommendations[0];

    expect(rec.action).toBe("LOWER_BID");
    expect(rec.suggestedBid).toBeGreaterThan(0);
    expect(rec.suggestedBid).toBeLessThan(kw.cpc);
  });

  it("returns NO_CHANGE for keyword with ACOS between target and threshold", () => {
    const kw = makeKW({
      keyword: "batana oil for hair growth",
      clicks: 1172,
      orders: 137,
      spend: 821,
      sales: 2321,
      acos: 35.37, // between 25% target and 40% threshold
      cpc: 0.7,
      bid: 1.0,
    });

    const result = runAnalysis([kw], [], defaultSettings);
    const rec = result.recommendations[0];

    expect(rec.action).toBe("NO_CHANGE");
  });

  it("returns NEGATE for keyword with 0 orders and sufficient clicks", () => {
    const kw = makeKW({
      keyword: "bad keyword",
      clicks: 50,
      orders: 0,
      spend: 25,
      sales: 0,
      acos: 0,
    });

    const result = runAnalysis([kw], [], defaultSettings);
    const rec = result.recommendations[0];

    expect(rec.action).toBe("NEGATE");
    expect(rec.suggestedBid).toBeNull();
  });

  it("returns INSUFFICIENT_DATA for keyword below click threshold", () => {
    const kw = makeKW({
      keyword: "low data keyword",
      clicks: 5,
    });

    const result = runAnalysis([kw], [], defaultSettings);
    const rec = result.recommendations[0];

    expect(rec.action).toBe("INSUFFICIENT_DATA");
  });

  it("returns INCREASE_BID for keyword with ACOS below target", () => {
    const kw = makeKW({
      keyword: "great keyword",
      clicks: 100,
      orders: 30,
      spend: 30,
      sales: 200,
      acos: 15,
      cpc: 0.3,
    });

    const result = runAnalysis([kw], [], defaultSettings);
    const rec = result.recommendations[0];

    expect(rec.action).toBe("INCREASE_BID");
    expect(rec.suggestedBid).toBeGreaterThan(kw.cpc);
  });

  it("returns NO_CHANGE for keyword with ACOS in range", () => {
    const kw = makeKW({
      acos: 30,
      cpc: 0.5,
    });

    const result = runAnalysis([kw], [], defaultSettings);
    const rec = result.recommendations[0];

    expect(rec.action).toBe("NO_CHANGE");
  });

  it("returns START_ADS for SQP-only keyword with above-market conversion", () => {
    const sqp = makeSQP({
      searchQuery: "new opportunity keyword",
      avgClickToPurchaseAsin: 10,
      avgClickToPurchaseTotal: 5,
    });

    const result = runAnalysis([], [sqp], defaultSettings);
    const rec = result.recommendations[0];

    expect(rec.action).toBe("START_ADS");
    expect(rec.source).toBe("sqp");
  });

  it("detects declining click share trend as REVIEW_PREVIEW", () => {
    const sqp = makeSQP({
      searchQuery: "trending down keyword",
      weeks: [
        { clickShareAsin: 10, purchaseShareAsin: 5 } as any,
        { clickShareAsin: 8, purchaseShareAsin: 5 } as any,
        { clickShareAsin: 6, purchaseShareAsin: 5 } as any,
      ],
    });

    const result = runAnalysis([], [sqp], defaultSettings);
    const rec = result.recommendations[0];

    expect(rec.trendFlags).toContain("REVIEW_PREVIEW");
  });

  it("detects declining purchase share trend as REVIEW_DETAIL_PAGE", () => {
    const sqp = makeSQP({
      searchQuery: "purchase declining keyword",
      weeks: [
        { clickShareAsin: 10, purchaseShareAsin: 8 } as any,
        { clickShareAsin: 10, purchaseShareAsin: 6 } as any,
        { clickShareAsin: 10, purchaseShareAsin: 4 } as any,
      ],
    });

    const result = runAnalysis([], [sqp], defaultSettings);
    const rec = result.recommendations[0];

    expect(rec.trendFlags).toContain("REVIEW_DETAIL_PAGE");
  });

  it("combines PPC action with SQP trend flags when both exist", () => {
    const kw = makeKW({
      keyword: "both sources keyword",
      acos: 55,
      cpc: 0.7,
    });
    const sqp = makeSQP({
      searchQuery: "both sources keyword",
      weeks: [
        { clickShareAsin: 10, purchaseShareAsin: 5 } as any,
        { clickShareAsin: 8, purchaseShareAsin: 5 } as any,
        { clickShareAsin: 6, purchaseShareAsin: 5 } as any,
      ],
    });

    const result = runAnalysis([kw], [sqp], defaultSettings);
    const rec = result.recommendations[0];

    expect(rec.action).toBe("LOWER_BID");
    expect(rec.trendFlags).toContain("REVIEW_PREVIEW");
    expect(rec.source).toBe("both");
  });

  it("summary counts match recommendation actions", () => {
    const keywords = [
      makeKW({ keyword: "kw1", acos: 15, clicks: 50 }), // INCREASE_BID
      makeKW({ keyword: "kw2", acos: 50, clicks: 50 }), // LOWER_BID
      makeKW({ keyword: "kw3", clicks: 50, orders: 0, acos: 0, sales: 0 }), // NEGATE
      makeKW({ keyword: "kw4", clicks: 3 }), // INSUFFICIENT_DATA
    ];

    const result = runAnalysis(keywords, [], defaultSettings);

    expect(result.summary.INCREASE_BID).toBe(1);
    expect(result.summary.LOWER_BID).toBe(1);
    expect(result.summary.NEGATE).toBe(1);
    expect(result.summary.INSUFFICIENT_DATA).toBe(1);
    expect(result.totalKeywords).toBe(4);
  });
});
