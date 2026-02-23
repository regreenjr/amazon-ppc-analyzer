import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { OrganicRankRow } from "@/types";

function safeFloat(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === "") return 0;
  const cleaned = String(value).replace(/[,]/g, "").trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

function safeNullableFloat(value: string | number | undefined | null): number | null {
  if (value === undefined || value === null || value === "" || value === "-") return null;
  const cleaned = String(value).replace(/[,]/g, "").trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Find the latest date column header from a list of headers.
 * Date columns are typically formatted as dates (e.g. "2026-02-15", "02/15/2026", "Feb 15").
 */
function findLatestDateColumn(headers: string[]): string | null {
  const dateColumns: { header: string; date: Date }[] = [];

  for (const h of headers) {
    // Skip known non-date columns
    const lower = h.toLowerCase().trim();
    if (
      lower === "search terms" ||
      lower === "median rank" ||
      lower === "search volume" ||
      lower === "aggregate"
    ) {
      continue;
    }

    // Try to parse as a date
    const d = new Date(h);
    if (!isNaN(d.getTime())) {
      dateColumns.push({ header: h, date: d });
    }
  }

  if (dateColumns.length === 0) return null;

  // Sort descending by date, return the latest
  dateColumns.sort((a, b) => b.date.getTime() - a.date.getTime());
  return dateColumns[0].header;
}

function findColumn(headers: string[], pattern: RegExp): string | undefined {
  return headers.find((h) => pattern.test(h.trim()));
}

function parseRows(
  rows: Record<string, string | number | undefined>[],
  headers: string[]
): OrganicRankRow[] {
  const colSearchTerms = findColumn(headers, /^Search\s*Terms?$/i);
  const colMedianRank = findColumn(headers, /^Median\s*Rank$/i);
  const colSearchVolume = findColumn(headers, /^Search\s*Volume$/i);
  const latestDateCol = findLatestDateColumn(headers);

  if (!colSearchTerms) {
    throw new Error(
      'Could not find "Search Terms" column in organic ranking file'
    );
  }

  const result: OrganicRankRow[] = [];

  for (const row of rows) {
    const searchTerm = String(row[colSearchTerms] ?? "").trim();

    // Skip empty rows and the AGGREGATE row
    if (!searchTerm || searchTerm.toUpperCase() === "AGGREGATE") continue;

    const medianRank = colMedianRank
      ? safeNullableFloat(row[colMedianRank])
      : null;
    const searchVolume = colSearchVolume
      ? safeFloat(row[colSearchVolume])
      : 0;
    const latestRank = latestDateCol
      ? safeNullableFloat(row[latestDateCol])
      : null;

    result.push({
      searchTerm,
      medianRank,
      searchVolume,
      latestRank,
    });
  }

  return result;
}

/**
 * Parse organic ranking data from an xlsx ArrayBuffer.
 */
export async function parseOrganicXlsx(
  buffer: ArrayBuffer
): Promise<OrganicRankRow[]> {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];

  if (!sheet) {
    throw new Error("No sheets found in organic ranking file");
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, string | number | undefined>>(sheet);
  if (rows.length === 0) return [];

  const headers = Object.keys(rows[0]);
  return parseRows(rows, headers);
}

/**
 * Parse organic ranking data from a CSV string.
 */
export async function parseOrganicCsv(
  csvText: string
): Promise<OrganicRankRow[]> {
  const parseResult = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
    throw new Error(
      `CSV parse error: ${parseResult.errors.map((e) => e.message).join("; ")}`
    );
  }

  const headers = parseResult.meta.fields ?? [];
  return parseRows(parseResult.data, headers);
}
