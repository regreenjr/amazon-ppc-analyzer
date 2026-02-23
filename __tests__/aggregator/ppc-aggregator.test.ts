import { describe, it, expect } from "vitest";
import { aggregatePPCKeywords } from "@/lib/aggregator/ppc-aggregator";
import { PPCKeywordRow } from "@/types";

function makeRow(overrides: Partial<PPCKeywordRow>): PPCKeywordRow {
  return {
    campaignName: "Campaign 1",
    adGroupName: "Ad Group 1",
    keyword: "test keyword",
    matchType: "Exact",
    state: "enabled",
    bid: 1.0,
    impressions: 100,
    clicks: 10,
    spend: 5,
    sales: 20,
    orders: 2,
    acos: 25,
    cpc: 0.5,
    conversionRate: 20,
    ...overrides,
  };
}

describe("aggregatePPCKeywords", () => {
  it("groups by lowercase keyword + matchType", () => {
    const report1 = [
      makeRow({ keyword: "Test Keyword", matchType: "Exact", clicks: 10, spend: 5, sales: 20, orders: 2 }),
    ];
    const report2 = [
      makeRow({ keyword: "test keyword", matchType: "Exact", clicks: 15, spend: 8, sales: 30, orders: 3 }),
    ];

    const result = aggregatePPCKeywords([report1, report2]);

    expect(result).toHaveLength(1);
    expect(result[0].clicks).toBe(25);
    expect(result[0].spend).toBe(13);
    expect(result[0].sales).toBe(50);
    expect(result[0].orders).toBe(5);
  });

  it("recalculates rates from sums, never averages", () => {
    const report1 = [makeRow({ clicks: 10, spend: 10, sales: 100, orders: 1 })];
    const report2 = [makeRow({ clicks: 10, spend: 10, sales: 0, orders: 0 })];

    const result = aggregatePPCKeywords([report1, report2]);

    // ACOS = (20/100)*100 = 20%, not (10+Infinity)/2
    expect(result[0].acos).toBe(20);
    // CPC = 20/20 = 1, not average of individual CPCs
    expect(result[0].cpc).toBe(1);
    // Conv rate = (1/20)*100 = 5%
    expect(result[0].conversionRate).toBe(5);
  });

  it("keeps different match types separate", () => {
    const rows = [
      makeRow({ keyword: "test", matchType: "Exact" }),
      makeRow({ keyword: "test", matchType: "Broad" }),
    ];

    const result = aggregatePPCKeywords([rows]);
    expect(result).toHaveLength(2);
  });

  it("collects unique campaigns", () => {
    const rows = [
      makeRow({ campaignName: "Camp A" }),
      makeRow({ campaignName: "Camp B" }),
      makeRow({ campaignName: "Camp A" }),
    ];

    const result = aggregatePPCKeywords([rows]);
    expect(result[0].campaigns).toHaveLength(2);
    expect(result[0].campaigns).toContain("Camp A");
    expect(result[0].campaigns).toContain("Camp B");
  });

  it("uses max bid across rows", () => {
    const rows = [
      makeRow({ bid: 1.0 }),
      makeRow({ bid: 2.5 }),
      makeRow({ bid: 1.5 }),
    ];

    const result = aggregatePPCKeywords([rows]);
    expect(result[0].bid).toBe(2.5);
  });

  it("handles zero sales without error", () => {
    const rows = [makeRow({ sales: 0, spend: 10 })];
    const result = aggregatePPCKeywords([rows]);
    expect(result[0].acos).toBe(0);
  });

  it("sorts by spend descending", () => {
    const rows = [
      makeRow({ keyword: "low spend", spend: 5 }),
      makeRow({ keyword: "high spend", spend: 50 }),
      makeRow({ keyword: "mid spend", spend: 20 }),
    ];

    const result = aggregatePPCKeywords([rows]);
    expect(result[0].keyword).toBe("high spend");
    expect(result[2].keyword).toBe("low spend");
  });
});
