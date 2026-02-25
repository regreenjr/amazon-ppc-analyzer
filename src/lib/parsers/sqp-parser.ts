import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { SQPWeeklyRow } from "@/types";

function findColumn(
  headers: string[],
  pattern: RegExp
): string | undefined {
  return headers.find((h) => pattern.test(h));
}

function safeFloat(value: string | undefined | null): number {
  if (value === undefined || value === null || value === "") return 0;
  const cleaned = String(value).replace(/[%,]/g, "").trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function safeInt(value: string | undefined | null): number {
  if (value === undefined || value === null || value === "") return 0;
  const cleaned = String(value).replace(/[,]/g, "").trim();
  const parsed = parseInt(cleaned, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Extract metadata from the first line(s) before the header.
 * Format: Brand=["Old School Labs"],Reporting Range=["Monthly"],Select year=["2026"],Select month=["January"]
 */
function extractMetadata(metadataLines: string[]): {
  brand: string;
  reportingRange: string;
} {
  let brand = "";
  let reportingRange = "";

  for (const line of metadataLines) {
    const brandMatch = line.match(/Brand=\["([^"]+)"\]/i);
    if (brandMatch) brand = brandMatch[1];

    const rangeMatch = line.match(/Reporting Range=\["([^"]+)"\]/i);
    if (rangeMatch) reportingRange = rangeMatch[1];
  }

  return { brand, reportingRange };
}

export async function parseSQPReport(
  csvText: string
): Promise<SQPWeeklyRow[]> {
  const lines = csvText.split(/\r?\n/);

  // Find the header row: contains "Search Query" (may be quoted)
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trimStart();
    if (
      trimmed.startsWith("Search Query") ||
      trimmed.startsWith('"Search Query')
    ) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    throw new Error(
      'Could not find header row starting with "Search Query" in the CSV'
    );
  }

  // Extract metadata from lines above the header
  const metadataLines = lines.slice(0, headerIndex);
  extractMetadata(metadataLines);

  // Rejoin from header row onward for parsing
  const dataText = lines.slice(headerIndex).join("\n");

  const parseResult = Papa.parse<Record<string, string>>(dataText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
    throw new Error(
      `CSV parse error: ${parseResult.errors.map((e) => e.message).join("; ")}`
    );
  }

  const headers = parseResult.meta.fields ?? [];

  // Map columns flexibly — Amazon SQP uses two different formats:
  // Format A (newer Brand Analytics): "Clicks: Total Count", "Clicks: Brand Count", "Purchases: Brand Count"
  // Format B (older ASIN-level): "Click Share - Total Count", "Click Share - ASIN Count"

  const colSearchQueryVolume = findColumn(headers, /Search Query Volume/i);
  const colSearchQueryScore = findColumn(headers, /Search Query Score/i);

  // Clicks total
  const colClicksTotal = findColumn(headers, /Clicks?[:\s].*Total\s*Count/i)
    ?? findColumn(headers, /Click Share.*Total\s*Count/i);

  // Clicks brand/ASIN
  const colClicksBrand = findColumn(headers, /Clicks?[:\s].*Brand\s*Count/i)
    ?? findColumn(headers, /Clicks?[:\s].*Brand\s*Share/i)
    ?? findColumn(headers, /Click Share.*(?:#\d+|Brand|ASIN)/i);

  // Cart adds total
  const colCartAddsTotal = findColumn(headers, /Cart Adds?[:\s].*Total\s*Count/i)
    ?? findColumn(headers, /Cart Add Share.*Total\s*Count/i);

  // Cart adds brand/ASIN
  const colCartAddsBrand = findColumn(headers, /Cart Adds?[:\s].*Brand\s*Count/i)
    ?? findColumn(headers, /Cart Adds?[:\s].*Brand\s*Share/i)
    ?? findColumn(headers, /Cart Add Share.*(?:#\d+|Brand|ASIN)/i);

  // Purchases total
  const colPurchasesTotal = findColumn(headers, /Purchases?[:\s].*Total\s*Count/i)
    ?? findColumn(headers, /Purchase Share.*Total\s*Count/i);

  // Purchases brand/ASIN
  const colPurchasesBrand = findColumn(headers, /Purchases?[:\s].*Brand\s*Count/i)
    ?? findColumn(headers, /Purchases?[:\s].*Brand\s*Share/i)
    ?? findColumn(headers, /Purchase Share.*(?:#\d+|Brand|ASIN)/i);

  // Reporting Date column (in the data itself)
  const colReportingDate = findColumn(headers, /Reporting\s*Date/i);

  const rows: SQPWeeklyRow[] = [];

  for (const row of parseResult.data) {
    const searchQuery = (row["Search Query"] ?? "").trim();
    if (!searchQuery) continue;

    const clicksTotal = safeFloat(colClicksTotal ? row[colClicksTotal] : undefined);
    const clicksBrand = safeFloat(colClicksBrand ? row[colClicksBrand] : undefined);
    const cartAddsTotal = safeFloat(colCartAddsTotal ? row[colCartAddsTotal] : undefined);
    const cartAddsBrand = safeFloat(colCartAddsBrand ? row[colCartAddsBrand] : undefined);
    const purchasesTotal = safeFloat(colPurchasesTotal ? row[colPurchasesTotal] : undefined);
    const purchasesBrand = safeFloat(colPurchasesBrand ? row[colPurchasesBrand] : undefined);

    // Derive share percentages from counts
    const clickShareTotal = clicksTotal;
    const clickShareAsin = clicksBrand;
    const cartAddShareTotal = cartAddsTotal;
    const cartAddShareAsin = cartAddsBrand;
    const purchaseShareTotal = purchasesTotal;
    const purchaseShareAsin = purchasesBrand;

    // Derive conversion rates: purchases / clicks
    const clickToPurchaseTotal =
      clicksTotal > 0 ? (purchasesTotal / clicksTotal) * 100 : 0;
    const clickToPurchaseAsin =
      clicksBrand > 0 ? (purchasesBrand / clicksBrand) * 100 : 0;
    const clickToCartTotal =
      clicksTotal > 0 ? (cartAddsTotal / clicksTotal) * 100 : 0;
    const clickToCartAsin =
      clicksBrand > 0 ? (cartAddsBrand / clicksBrand) * 100 : 0;

    // Get reporting date from data column or fallback
    const reportingWeek = colReportingDate
      ? (row[colReportingDate] ?? "").trim()
      : "";

    rows.push({
      searchQuery,
      searchQueryVolume: safeInt(colSearchQueryVolume ? row[colSearchQueryVolume] : undefined),
      searchQueryScore: safeInt(colSearchQueryScore ? row[colSearchQueryScore] : undefined),
      clickShareTotal,
      clickShareAsin,
      cartAddShareTotal,
      cartAddShareAsin,
      purchaseShareTotal,
      purchaseShareAsin,
      clickToCartTotal: Math.round(clickToCartTotal * 100) / 100,
      clickToCartAsin: Math.round(clickToCartAsin * 100) / 100,
      clickToPurchaseTotal: Math.round(clickToPurchaseTotal * 100) / 100,
      clickToPurchaseAsin: Math.round(clickToPurchaseAsin * 100) / 100,
      reportingWeek,
      asin: "", // Brand-level reports don't have a single ASIN
    });
  }

  return rows;
}

/**
 * Parse SQP report from an XLSX file.
 * Converts the first sheet to CSV text, then delegates to parseSQPReport.
 */
export async function parseSQPXlsx(
  buffer: ArrayBuffer
): Promise<SQPWeeklyRow[]> {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error("No sheets found in SQP XLSX file");
  }

  const csvText = XLSX.utils.sheet_to_csv(sheet);
  return parseSQPReport(csvText);
}
