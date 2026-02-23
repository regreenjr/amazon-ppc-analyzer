import Papa from "papaparse";
import type { SQPWeeklyRow } from "@/types";

/**
 * Find a column header that matches a regex pattern.
 * Returns the exact header string or undefined if not found.
 */
function findColumn(
  headers: string[],
  pattern: RegExp
): string | undefined {
  return headers.find((h) => pattern.test(h));
}

function safeFloat(value: string | undefined | null): number {
  if (value === undefined || value === null || value === "") return 0;
  // Remove % signs and commas that Amazon sometimes includes
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
 * Extract metadata from the lines preceding the data header.
 * Looks for ASIN and reporting date range in the metadata rows.
 */
function extractMetadata(metadataLines: string[]): {
  asin: string;
  reportingWeek: string;
} {
  let asin = "";
  let reportingWeek = "";

  for (const line of metadataLines) {
    // Look for ASIN — typically in a line like "ASIN: B0XXXXXXXX" or as a CSV field
    if (/\bASIN\b/i.test(line)) {
      const asinMatch = line.match(/\b(B0[A-Z0-9]{8})\b/);
      if (asinMatch) {
        asin = asinMatch[1];
      }
    }

    // Look for reporting date range
    if (/reporting\s*(date\s*)?range/i.test(line)) {
      // Extract date portion — e.g., "01/01/2024 - 01/07/2024" or similar
      const dateMatch = line.match(
        /(\d{1,2}\/\d{1,2}\/\d{4}\s*[-–]\s*\d{1,2}\/\d{1,2}\/\d{4})/
      );
      if (dateMatch) {
        reportingWeek = dateMatch[1].trim();
      } else {
        // Fallback: grab everything after the label
        const parts = line.split(/[,:]\s*/);
        const idx = parts.findIndex((p) =>
          /reporting\s*(date\s*)?range/i.test(p)
        );
        if (idx !== -1 && idx + 1 < parts.length) {
          reportingWeek = parts[idx + 1].trim();
        }
      }
    }
  }

  return { asin, reportingWeek };
}

export async function parseSQPReport(
  csvText: string
): Promise<SQPWeeklyRow[]> {
  const lines = csvText.split(/\r?\n/);

  // Find the header row: the first line that starts with "Search Query"
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trimStart().startsWith("Search Query")) {
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
  const { asin, reportingWeek } = extractMetadata(metadataLines);

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

  // Map columns by partial match
  const colSearchQueryVolume = findColumn(headers, /Search Query Volume/i);
  const colSearchQueryScore = findColumn(headers, /Search Query Score/i);

  // Click Share columns
  const colClickShareTotal = findColumn(
    headers,
    /Click Share.*Total\s*Count/i
  );
  const colClickShareAsin = findColumn(
    headers,
    /Click Share.*(?:#\d+|Brand|ASIN)/i
  ) ?? findColumnByAsin(headers, /Click Share/i, asin);

  // Cart Add Share columns
  const colCartAddShareTotal = findColumn(
    headers,
    /Cart Add Share.*Total\s*Count/i
  );
  const colCartAddShareAsin = findColumn(
    headers,
    /Cart Add Share.*(?:#\d+|Brand|ASIN)/i
  ) ?? findColumnByAsin(headers, /Cart Add Share/i, asin);

  // Purchase Share columns
  const colPurchaseShareTotal = findColumn(
    headers,
    /Purchase Share.*Total\s*Count/i
  );
  const colPurchaseShareAsin = findColumn(
    headers,
    /Purchase Share.*(?:#\d+|Brand|ASIN)/i
  ) ?? findColumnByAsin(headers, /Purchase Share/i, asin);

  const rows: SQPWeeklyRow[] = [];

  for (const row of parseResult.data) {
    const searchQuery = (row["Search Query"] ?? "").trim();
    if (!searchQuery) continue;

    const clickShareTotal = safeFloat(
      colClickShareTotal ? row[colClickShareTotal] : undefined
    );
    const clickShareAsin = safeFloat(
      colClickShareAsin ? row[colClickShareAsin] : undefined
    );
    const cartAddShareTotal = safeFloat(
      colCartAddShareTotal ? row[colCartAddShareTotal] : undefined
    );
    const cartAddShareAsin = safeFloat(
      colCartAddShareAsin ? row[colCartAddShareAsin] : undefined
    );
    const purchaseShareTotal = safeFloat(
      colPurchaseShareTotal ? row[colPurchaseShareTotal] : undefined
    );
    const purchaseShareAsin = safeFloat(
      colPurchaseShareAsin ? row[colPurchaseShareAsin] : undefined
    );

    // Derive click-to-cart and click-to-purchase rates
    // These represent: of the clicks, what share converted to cart/purchase
    const clickToCartTotal =
      clickShareTotal > 0
        ? (cartAddShareTotal / clickShareTotal) * 100
        : 0;
    const clickToCartAsin =
      clickShareAsin > 0
        ? (cartAddShareAsin / clickShareAsin) * 100
        : 0;
    const clickToPurchaseTotal =
      clickShareTotal > 0
        ? (purchaseShareTotal / clickShareTotal) * 100
        : 0;
    const clickToPurchaseAsin =
      clickShareAsin > 0
        ? (purchaseShareAsin / clickShareAsin) * 100
        : 0;

    rows.push({
      searchQuery,
      searchQueryVolume: safeInt(
        colSearchQueryVolume ? row[colSearchQueryVolume] : undefined
      ),
      searchQueryScore: safeInt(
        colSearchQueryScore ? row[colSearchQueryScore] : undefined
      ),
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
      asin,
    });
  }

  return rows;
}

/**
 * Fallback column finder: looks for a column matching the category pattern
 * that also contains the ASIN string. This handles Amazon's column naming
 * where the ASIN-specific column includes the actual ASIN in the header.
 */
function findColumnByAsin(
  headers: string[],
  categoryPattern: RegExp,
  asin: string
): string | undefined {
  if (!asin) return undefined;
  return headers.find(
    (h) => categoryPattern.test(h) && h.includes(asin)
  );
}
