import Papa from "papaparse";
import type { PPCKeywordRow } from "@/types";

type RawRow = Record<string, string | undefined>;

function safeFloat(value: string | undefined | null): number {
  if (value === undefined || value === null || value === "" || value === "--") return 0;
  const cleaned = String(value).replace(/[%,$,]/g, "").trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function safeInt(value: string | undefined | null): number {
  if (value === undefined || value === null || value === "" || value === "--") return 0;
  const cleaned = String(value).replace(/[,]/g, "").trim();
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

function findColumn(headers: string[], pattern: RegExp): string | undefined {
  return headers.find((h) => pattern.test(h));
}

export function parsePPCSearchTermsCSV(csvText: string): PPCKeywordRow[] {
  const result = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = result.meta.fields ?? [];

  const colKeyword = findColumn(headers, /^Search\s*terms?$/i) ?? "Search terms";
  const colClicks = findColumn(headers, /^Clicks\s*\(.*\)$/i) ?? "Clicks(Current period)";
  const colSpend = findColumn(headers, /^Spend\s*\(.*\)$/i) ?? "Spend(Current period)";
  const colOrders = findColumn(headers, /^Orders\s*\(.*\)$/i) ?? "Orders(Current period)";
  const colSales = findColumn(headers, /^Sales\s*\(.*\)$/i) ?? "Sales(Current period)";
  const colAcos = findColumn(headers, /^ACOS\s*\(.*\)$/i) ?? "ACOS(Current period)";
  const colCvr = findColumn(headers, /^CVR\s*\(.*\)$/i) ?? "CVR(Current period)";

  const rows: PPCKeywordRow[] = [];

  for (const raw of result.data) {
    const keyword = (raw[colKeyword] ?? "").trim();
    if (!keyword || keyword === "--") continue;

    const clicks = safeInt(raw[colClicks]);
    const spend = safeFloat(raw[colSpend]);
    const orders = safeInt(raw[colOrders]);
    const sales = safeFloat(raw[colSales]);

    // ACOS and CVR come as percentages (e.g. "25.00%" or "0.25")
    let acos = safeFloat(raw[colAcos]);
    if (acos > 0 && acos < 1 && raw[colAcos] && !raw[colAcos].includes("%")) {
      acos = acos * 100;
    }

    let conversionRate = safeFloat(raw[colCvr]);
    if (conversionRate > 0 && conversionRate < 1 && raw[colCvr] && !raw[colCvr].includes("%")) {
      conversionRate = conversionRate * 100;
    }

    const cpc = clicks > 0 ? spend / clicks : 0;

    rows.push({
      campaignName: "Search Terms Report",
      adGroupName: "",
      keyword,
      matchType: "Broad",
      state: "enabled",
      bid: 0,
      impressions: 0,
      clicks,
      spend,
      sales,
      orders,
      acos: Math.round(acos * 100) / 100,
      cpc: Math.round(cpc * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
    });
  }

  return rows;
}
