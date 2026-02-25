import * as XLSX from "xlsx";
import type { PPCKeywordRow } from "@/types";

const SHEET_NAME = "Sponsored Products Campaigns";

// Use Record to handle Amazon's varying column names
type RawPPCRow = Record<string, string | number | undefined>;

function safeFloat(value: string | number | undefined): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? 0 : parsed;
}

function safeInt(value: string | number | undefined): number {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? 0 : parsed;
}

function isValidMatchType(value: string): value is "Broad" | "Phrase" | "Exact" {
  return value === "Broad" || value === "Phrase" || value === "Exact";
}

/**
 * Get value from row, trying multiple possible column names.
 * Amazon bulk reports use "Campaign Name" for editable fields and
 * "Campaign Name (Informational only)" for read-only display values.
 */
function getField(row: RawPPCRow, ...keys: string[]): string | number | undefined {
  for (const key of keys) {
    const val = row[key];
    if (val !== undefined && val !== null && val !== "") return val;
  }
  return undefined;
}

function findField(headers: string[], pattern: RegExp): string | undefined {
  return headers.find((h) => pattern.test(h));
}

function parseBulkReportSheet(sheet: XLSX.WorkSheet): PPCKeywordRow[] {
  const rows = XLSX.utils.sheet_to_json<RawPPCRow>(sheet);

  const keywordRows = rows.filter(
    (row) => row["Entity"] === "Keyword"
  );

  return keywordRows.map((row) => {
    const spend = safeFloat(row["Spend"]);
    const sales = safeFloat(row["Sales"]);
    const clicks = safeInt(row["Clicks"]);
    const orders = safeInt(row["Orders"]);

    const acos = sales > 0 ? (spend / sales) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const conversionRate = clicks > 0 ? (orders / clicks) * 100 : 0;

    const rawMatchType = String(row["Match Type"] ?? "");
    const matchType: "Broad" | "Phrase" | "Exact" = isValidMatchType(rawMatchType)
      ? rawMatchType
      : "Broad";

    const campaignName = String(
      getField(row, "Campaign Name", "Campaign Name (Informational only)") ?? ""
    );
    const adGroupName = String(
      getField(row, "Ad Group Name", "Ad Group Name (Informational only)") ?? ""
    );
    const keyword = String(
      getField(row, "Keyword Text", "Keyword") ?? ""
    );

    return {
      campaignName,
      adGroupName,
      keyword,
      matchType,
      state: String(row["State"] ?? ""),
      bid: safeFloat(row["Bid"]),
      impressions: safeInt(row["Impressions"]),
      clicks,
      spend,
      sales,
      orders,
      acos: Math.round(acos * 100) / 100,
      cpc: Math.round(cpc * 100) / 100,
      conversionRate: Math.round(conversionRate * 100) / 100,
    };
  });
}

/**
 * Parse Amazon Ads Search Term Report XLSX (multi-sheet, columns like
 * "Customer Search Term", "7 Day Total Sales", "ACOS", etc.)
 */
function parseSearchTermXlsx(workbook: XLSX.WorkBook): PPCKeywordRow[] {
  const allRows: PPCKeywordRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<RawPPCRow>(sheet);
    if (rows.length === 0) continue;

    const headers = Object.keys(rows[0]);

    // Detect this format by looking for "Customer Search Term"
    const colKeyword = findField(headers, /Customer\s*Search\s*Term/i);
    if (!colKeyword) continue;

    const colClicks = findField(headers, /^Clicks$/i);
    const colSpend = findField(headers, /^Spend$/i);
    const colSales = findField(headers, /7\s*Day\s*Total\s*Sales/i);
    const colOrders = findField(headers, /7\s*Day\s*Total\s*Orders/i);
    const colAcos = findField(headers, /ACOS/i);
    const colCpc = findField(headers, /Cost\s*Per\s*Click|CPC/i);
    const colImpressions = findField(headers, /^Impressions$/i);
    const colMatchType = findField(headers, /^Match\s*Type$/i);
    const colCampaign = findField(headers, /^Campaign\s*Name$/i);
    const colAdGroup = findField(headers, /^Ad\s*Group\s*Name$/i);
    const colCvr = findField(headers, /Conversion\s*Rate/i);

    for (const row of rows) {
      const keyword = String(row[colKeyword!] ?? "").trim();
      if (!keyword || keyword === "*") continue;

      const clicks = safeInt(colClicks ? row[colClicks] : undefined);
      const spend = safeFloat(colSpend ? row[colSpend] : undefined);
      const sales = safeFloat(colSales ? row[colSales] : undefined);
      const orders = safeInt(colOrders ? row[colOrders] : undefined);
      const impressions = safeInt(colImpressions ? row[colImpressions] : undefined);

      let acos = safeFloat(colAcos ? row[colAcos] : undefined);
      if (acos === 0 && sales > 0) {
        acos = (spend / sales) * 100;
      }
      // If ACOS looks like a decimal ratio, convert to percentage
      if (acos > 0 && acos < 1) {
        acos = acos * 100;
      }

      const cpc = colCpc ? safeFloat(row[colCpc]) : (clicks > 0 ? spend / clicks : 0);

      let conversionRate = safeFloat(colCvr ? row[colCvr] : undefined);
      if (conversionRate === 0 && clicks > 0) {
        conversionRate = (orders / clicks) * 100;
      }
      if (conversionRate > 0 && conversionRate < 1) {
        conversionRate = conversionRate * 100;
      }

      const rawMatchType = String(colMatchType ? row[colMatchType] ?? "" : "").toUpperCase();
      const normalizedMatch = rawMatchType.charAt(0) + rawMatchType.slice(1).toLowerCase();
      const matchType: "Broad" | "Phrase" | "Exact" = isValidMatchType(normalizedMatch)
        ? normalizedMatch
        : "Broad";

      const campaignName = String(colCampaign ? row[colCampaign] ?? "" : "Search Terms Report");
      const adGroupName = String(colAdGroup ? row[colAdGroup] ?? "" : "");

      allRows.push({
        campaignName,
        adGroupName,
        keyword,
        matchType,
        state: "enabled",
        bid: 0,
        impressions,
        clicks,
        spend,
        sales,
        orders,
        acos: Math.round(acos * 100) / 100,
        cpc: Math.round(cpc * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
      });
    }
  }

  return allRows;
}

export async function parsePPCReport(
  buffer: ArrayBuffer
): Promise<PPCKeywordRow[]> {
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheet = workbook.Sheets[SHEET_NAME];
  if (sheet) {
    return parseBulkReportSheet(sheet);
  }

  // Try parsing as Amazon Ads Search Term Report (multi-sheet XLSX)
  const searchTermRows = parseSearchTermXlsx(workbook);
  if (searchTermRows.length > 0) {
    return searchTermRows;
  }

  return [];
}
