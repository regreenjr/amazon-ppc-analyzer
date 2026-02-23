import { describe, it, expect } from "vitest";
import { aggregateSQPQueries } from "@/lib/aggregator/sqp-aggregator";
import { SQPWeeklyRow } from "@/types";

function makeWeek(overrides: Partial<SQPWeeklyRow>): SQPWeeklyRow {
  return {
    searchQuery: "test query",
    searchQueryVolume: 1000,
    searchQueryScore: 5,
    clickShareTotal: 10,
    clickShareAsin: 2,
    cartAddShareTotal: 5,
    cartAddShareAsin: 1,
    purchaseShareTotal: 3,
    purchaseShareAsin: 0.5,
    clickToCartTotal: 50,
    clickToCartAsin: 50,
    clickToPurchaseTotal: 30,
    clickToPurchaseAsin: 25,
    reportingWeek: "2024-01-01",
    asin: "B0TEST12345",
    ...overrides,
  };
}

describe("aggregateSQPQueries", () => {
  it("groups by lowercase search query and asin", () => {
    const week1 = [makeWeek({ searchQuery: "Test Query", reportingWeek: "2024-01-01" })];
    const week2 = [makeWeek({ searchQuery: "test query", reportingWeek: "2024-01-08" })];

    const result = aggregateSQPQueries([week1, week2]);
    expect(result).toHaveLength(1);
    expect(result[0].weeks).toHaveLength(2);
  });

  it("sorts weeks chronologically", () => {
    const weeks = [
      makeWeek({ reportingWeek: "2024-01-15" }),
      makeWeek({ reportingWeek: "2024-01-01" }),
      makeWeek({ reportingWeek: "2024-01-08" }),
    ];

    const result = aggregateSQPQueries([weeks]);
    expect(result[0].weeks[0].reportingWeek).toBe("2024-01-01");
    expect(result[0].weeks[2].reportingWeek).toBe("2024-01-15");
  });

  it("detects declining click share trend", () => {
    const weeks = [
      makeWeek({ reportingWeek: "2024-01-01", clickShareAsin: 10 }),
      makeWeek({ reportingWeek: "2024-01-08", clickShareAsin: 8 }),
      makeWeek({ reportingWeek: "2024-01-15", clickShareAsin: 6 }),
    ];

    const result = aggregateSQPQueries([weeks]);
    expect(result[0].clickShareTrend).toBe("declining");
  });

  it("detects growing purchase share trend", () => {
    const weeks = [
      makeWeek({ reportingWeek: "2024-01-01", purchaseShareAsin: 2 }),
      makeWeek({ reportingWeek: "2024-01-08", purchaseShareAsin: 4 }),
      makeWeek({ reportingWeek: "2024-01-15", purchaseShareAsin: 6 }),
    ];

    const result = aggregateSQPQueries([weeks]);
    expect(result[0].purchaseShareTrend).toBe("growing");
  });

  it("marks as stable when trend is flat", () => {
    const weeks = [
      makeWeek({ reportingWeek: "2024-01-01", clickShareAsin: 5 }),
      makeWeek({ reportingWeek: "2024-01-08", clickShareAsin: 5 }),
      makeWeek({ reportingWeek: "2024-01-15", clickShareAsin: 5 }),
    ];

    const result = aggregateSQPQueries([weeks]);
    expect(result[0].clickShareTrend).toBe("stable");
  });

  it("sorts results by avg search volume descending", () => {
    const weeks = [
      makeWeek({ searchQuery: "low vol", searchQueryVolume: 100 }),
      makeWeek({ searchQuery: "high vol", searchQueryVolume: 10000 }),
    ];

    const result = aggregateSQPQueries([weeks]);
    expect(result[0].searchQuery).toBe("high vol");
  });
});
