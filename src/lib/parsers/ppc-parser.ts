import * as XLSX from "xlsx";
import type { PPCKeywordRow } from "@/types";

const SHEET_NAME = "Sponsored Products Campaigns";

interface RawPPCRow {
  Entity?: string;
  "Campaign Name"?: string;
  "Ad Group Name"?: string;
  Keyword?: string;
  "Match Type"?: string;
  State?: string;
  Bid?: string | number;
  Impressions?: string | number;
  Clicks?: string | number;
  Spend?: string | number;
  Sales?: string | number;
  Orders?: string | number;
}

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

export async function parsePPCReport(
  buffer: ArrayBuffer
): Promise<PPCKeywordRow[]> {
  const workbook = XLSX.read(buffer, { type: "array" });

  const sheet = workbook.Sheets[SHEET_NAME];
  if (!sheet) {
    const available = workbook.SheetNames.join(", ");
    throw new Error(
      `Sheet "${SHEET_NAME}" not found. Available sheets: ${available}`
    );
  }

  const rows = XLSX.utils.sheet_to_json<RawPPCRow>(sheet);

  const keywordRows = rows.filter(
    (row) => row.Entity === "Keyword"
  );

  const parsed: PPCKeywordRow[] = keywordRows.map((row) => {
    const spend = safeFloat(row.Spend);
    const sales = safeFloat(row.Sales);
    const clicks = safeInt(row.Clicks);
    const orders = safeInt(row.Orders);

    const acos = sales > 0 ? (spend / sales) * 100 : 0;
    const cpc = clicks > 0 ? spend / clicks : 0;
    const conversionRate = clicks > 0 ? (orders / clicks) * 100 : 0;

    const rawMatchType = String(row["Match Type"] ?? "");
    const matchType: "Broad" | "Phrase" | "Exact" = isValidMatchType(rawMatchType)
      ? rawMatchType
      : "Broad";

    return {
      campaignName: String(row["Campaign Name"] ?? ""),
      adGroupName: String(row["Ad Group Name"] ?? ""),
      keyword: String(row.Keyword ?? ""),
      matchType,
      state: String(row.State ?? ""),
      bid: safeFloat(row.Bid),
      impressions: safeInt(row.Impressions),
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
