import jsPDF from "jspdf";
import { WASPReport, WASPCategory } from "@/types";
import { fmtCurrency, fmtPct } from "@/lib/utils/number-format";

type RGB = [number, number, number];

// --- Color palette (matches shadcn theme) ---
const NAVY: RGB = [30, 41, 59];       // header bg
const RED: RGB = [239, 68, 68];        // waste/destructive
const CARD_BG: RGB = [248, 250, 252];  // muted background
const BORDER: RGB = [226, 232, 240];   // card border
const WHITE: RGB = [255, 255, 255];
const TEXT: RGB = [15, 23, 42];        // slate-900
const TEXT_MUTED: RGB = [100, 116, 139]; // slate-500
const ORANGE: RGB = [249, 115, 22];    // medium severity

// --- Layout constants ---
const PAGE_W = 210; // A4 mm
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;

// severity badge colors
const SEVERITY_COLORS: Record<WASPCategory["severity"], { bg: RGB; text: RGB; label: string }> = {
  high:   { bg: RED,    text: WHITE, label: "HIGH" },
  medium: { bg: ORANGE, text: WHITE, label: "MEDIUM" },
  low:    { bg: BORDER, text: TEXT,  label: "LOW" },
};

function setFill(doc: jsPDF, c: RGB) { doc.setFillColor(c[0], c[1], c[2]); }
function setDraw(doc: jsPDF, c: RGB) { doc.setDrawColor(c[0], c[1], c[2]); }
function setText(doc: jsPDF, c: RGB) { doc.setTextColor(c[0], c[1], c[2]); }

export function exportWASPToPDF(report: WASPReport): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = 0;

  // ── 1. Header bar ──────────────────────────────────────
  const headerH = 30;
  setFill(doc, NAVY);
  doc.rect(0, y, PAGE_W, headerH, "F");

  setText(doc, WHITE);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("WASP Report", MARGIN, y + 12);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Wasted Ad Spend Analysis", MARGIN, y + 19);

  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.setFontSize(9);
  doc.text(dateStr, PAGE_W - MARGIN, y + 12, { align: "right" });

  y += headerH + 8;

  // ── 2. Summary banner ──────────────────────────────────
  const summaryH = 32;
  setFill(doc, CARD_BG);
  setDraw(doc, BORDER);
  doc.setLineWidth(0.5);
  doc.roundedRect(MARGIN, y, CONTENT_W, summaryH, 3, 3, "FD");

  const colW = CONTENT_W / 3;
  const summaryItems: { label: string; value: string; color: RGB }[] = [
    { label: "Total Ad Spend", value: fmtCurrency(report.totalAdSpend), color: TEXT },
    { label: "Estimated Waste", value: fmtCurrency(report.totalWastedSpend), color: RED },
    { label: "Waste Percentage", value: fmtPct(report.wastePercentage), color: RED },
  ];

  summaryItems.forEach((item, i) => {
    const cx = MARGIN + colW * i + colW / 2;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setText(doc, TEXT_MUTED);
    doc.text(item.label, cx, y + 10, { align: "center" });

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    setText(doc, item.color);
    doc.text(item.value, cx, y + 22, { align: "center" });
  });

  y += summaryH + 10;

  // ── 3. Category cards ──────────────────────────────────
  report.categories.forEach((cat) => {
    const cardH = 50;

    // Card background
    setFill(doc, WHITE);
    setDraw(doc, BORDER);
    doc.setLineWidth(0.4);
    doc.roundedRect(MARGIN, y, CONTENT_W, cardH, 3, 3, "FD");

    // Severity badge (top-right)
    const sev = SEVERITY_COLORS[cat.severity];
    const badgeW = 22;
    const badgeH = 6;
    const badgeX = MARGIN + CONTENT_W - badgeW - 6;
    const badgeY = y + 6;
    setFill(doc, sev.bg);
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 2, 2, "F");
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    setText(doc, sev.text);
    doc.text(sev.label, badgeX + badgeW / 2, badgeY + 4.2, { align: "center" });

    // Category label
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    setText(doc, TEXT);
    doc.text(cat.label, MARGIN + 8, y + 12);

    // Description (wrap within left area)
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setText(doc, TEXT_MUTED);
    const descMaxW = CONTENT_W - 16;
    const descLines = doc.splitTextToSize(cat.description, descMaxW);
    doc.text(descLines.slice(0, 2), MARGIN + 8, y + 19);

    // Stats row (bottom of card)
    const statsY = y + 34;
    const statsColW = (CONTENT_W - 16) / 3;
    const stats = [
      { label: "Keywords", value: String(cat.keywordCount) },
      { label: "Total Spend", value: fmtCurrency(cat.totalSpend) },
      { label: "Estimated Waste", value: fmtCurrency(cat.estimatedWaste) },
    ];

    stats.forEach((stat, i) => {
      const sx = MARGIN + 8 + statsColW * i + statsColW / 2;

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      setText(doc, TEXT_MUTED);
      doc.text(stat.label, sx, statsY, { align: "center" });

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      setText(doc, i === 2 ? RED : TEXT);
      doc.text(stat.value, sx, statsY + 7, { align: "center" });
    });

    y += cardH + 8;
  });

  // ── 4. Footer ──────────────────────────────────────────
  y += 4;
  setDraw(doc, BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  setText(doc, NAVY);
  doc.text(
    "Reduce your wasted ad spend. Get a free PPC audit today.",
    PAGE_W / 2,
    y,
    { align: "center" }
  );
  y += 6;

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  setText(doc, TEXT_MUTED);
  doc.text(
    "Generated by Amazon PPC Analyzer",
    PAGE_W / 2,
    y,
    { align: "center" }
  );

  // ── Save ───────────────────────────────────────────────
  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`wasp-report-${dateSlug}.pdf`);
}
