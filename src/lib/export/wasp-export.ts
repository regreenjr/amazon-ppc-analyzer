import { WASPReport } from "@/types";
import { fmtCurrency, fmtPct } from "@/lib/utils/number-format";

const CSV_COLUMNS = [
  "Category",
  "Description",
  "Keywords",
  "Total Spend",
  "Estimated Waste",
  "Severity",
];

function escapeCSVField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportWASPToCSV(report: WASPReport): void {
  const summaryRow = [
    "SUMMARY",
    `Total Ad Spend: ${fmtCurrency(report.totalAdSpend)} | Total Waste: ${fmtCurrency(report.totalWastedSpend)} | Waste %: ${fmtPct(report.wastePercentage)}`,
    "",
    fmtCurrency(report.totalAdSpend),
    fmtCurrency(report.totalWastedSpend),
    "",
  ];

  const headerRow = CSV_COLUMNS.map(escapeCSVField).join(",");

  const dataRows = report.categories.map((cat) =>
    [
      cat.label,
      cat.description,
      String(cat.keywordCount),
      fmtCurrency(cat.totalSpend),
      fmtCurrency(cat.estimatedWaste),
      cat.severity.toUpperCase(),
    ]
      .map(escapeCSVField)
      .join(",")
  );

  const csvContent = [
    headerRow,
    summaryRow.map(escapeCSVField).join(","),
    "",
    ...dataRows,
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const filename = `wasp-report-${date}.csv`;

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();

  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
