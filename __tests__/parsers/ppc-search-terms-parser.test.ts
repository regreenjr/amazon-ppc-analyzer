import { describe, it, expect } from "vitest";
import { parsePPCSearchTermsCSV } from "@/lib/parsers/ppc-search-terms-parser";

const BASIC_CSV = `Search terms,Clicks(Current period),Spend(Current period),Orders(Current period),Sales(Current period),ACOS(Current period),CVR(Current period)
wireless earbuds,50,$25.00,5,$100.00,25.00%,10.00%
bluetooth speaker,30,$15.00,3,$60.00,25.00%,10.00%`;

describe("parsePPCSearchTermsCSV", () => {
  it("parses basic rows with correct mapping", () => {
    const rows = parsePPCSearchTermsCSV(BASIC_CSV);
    expect(rows).toHaveLength(2);

    const first = rows[0];
    expect(first.keyword).toBe("wireless earbuds");
    expect(first.clicks).toBe(50);
    expect(first.spend).toBe(25);
    expect(first.orders).toBe(5);
    expect(first.sales).toBe(100);
    expect(first.acos).toBe(25);
    expect(first.conversionRate).toBe(10);
    expect(first.cpc).toBe(0.5);
  });

  it("sets default values for missing PPC fields", () => {
    const rows = parsePPCSearchTermsCSV(BASIC_CSV);
    const row = rows[0];
    expect(row.campaignName).toBe("Search Terms Report");
    expect(row.adGroupName).toBe("");
    expect(row.matchType).toBe("Broad");
    expect(row.state).toBe("enabled");
    expect(row.bid).toBe(0);
    expect(row.impressions).toBe(0);
  });

  it("treats -- as zero", () => {
    const csv = `Search terms,Clicks(Current period),Spend(Current period),Orders(Current period),Sales(Current period),ACOS(Current period),CVR(Current period)
some keyword,--,--,--,--,--,--`;
    const rows = parsePPCSearchTermsCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].clicks).toBe(0);
    expect(rows[0].spend).toBe(0);
    expect(rows[0].orders).toBe(0);
    expect(rows[0].sales).toBe(0);
    expect(rows[0].acos).toBe(0);
    expect(rows[0].cpc).toBe(0);
  });

  it("skips rows with empty or -- keyword", () => {
    const csv = `Search terms,Clicks(Current period),Spend(Current period),Orders(Current period),Sales(Current period),ACOS(Current period),CVR(Current period)
,10,$5.00,1,$10.00,50.00%,10.00%
--,10,$5.00,1,$10.00,50.00%,10.00%
valid keyword,10,$5.00,1,$10.00,50.00%,10.00%`;
    const rows = parsePPCSearchTermsCSV(csv);
    expect(rows).toHaveLength(1);
    expect(rows[0].keyword).toBe("valid keyword");
  });

  it("derives CPC from spend/clicks", () => {
    const csv = `Search terms,Clicks(Current period),Spend(Current period),Orders(Current period),Sales(Current period),ACOS(Current period),CVR(Current period)
test,20,$10.00,2,$40.00,25.00%,10.00%`;
    const rows = parsePPCSearchTermsCSV(csv);
    expect(rows[0].cpc).toBe(0.5);
  });

  it("handles decimal ACOS/CVR values (without %)", () => {
    const csv = `Search terms,Clicks(Current period),Spend(Current period),Orders(Current period),Sales(Current period),ACOS(Current period),CVR(Current period)
test,10,$5.00,1,$20.00,0.25,0.10`;
    const rows = parsePPCSearchTermsCSV(csv);
    expect(rows[0].acos).toBe(25);
    expect(rows[0].conversionRate).toBe(10);
  });

  it("returns empty array for empty CSV", () => {
    const csv = `Search terms,Clicks(Current period),Spend(Current period),Orders(Current period),Sales(Current period),ACOS(Current period),CVR(Current period)`;
    const rows = parsePPCSearchTermsCSV(csv);
    expect(rows).toHaveLength(0);
  });
});
