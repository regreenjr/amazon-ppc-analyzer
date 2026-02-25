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

export async function parsePPCReport(
  buffer: ArrayBuffer
): Promise<PPCKeywordRow[]> {
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) {
    // Not a PPC bulk report — return empty so other parsers can handle it
    return [];
  }

  const rows = XLSX.utils.sheet_to_json<RawPPCRow>(sheet);

  const keywordRows = rows.filter(
    (row) => row["Entity"] === "Keyword"
  );

  const parsed: PPCKeywordRow[] = keywordRows.map((row) => {
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

    // Amazon uses "Keyword Text" for the keyword, not "Keyword"
    // Campaign/Ad Group names may be empty in editable columns; fall back to "(Informational only)" versions
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

  return parsed;
}
