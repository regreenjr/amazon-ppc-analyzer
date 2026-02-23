"use client";

import { useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { Recommendation } from "@/types";
import { fmtPct, fmtCurrency } from "@/lib/utils/number-format";
import { RecommendationBadge } from "./RecommendationBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const col = createColumnHelper<Recommendation>();

const columns = [
  col.accessor("keyword", {
    header: "Keyword",
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  col.accessor("matchType", { header: "Match" }),
  col.accessor("campaigns", {
    header: "Campaign",
    cell: (info) => (
      <span className="text-xs">{info.getValue().join("; ") || "—"}</span>
    ),
  }),
  col.accessor("action", {
    header: "Action",
    cell: (info) => <RecommendationBadge action={info.getValue()} />,
  }),
  col.accessor("trendFlags", {
    header: "Trends",
    cell: (info) => {
      const flags = info.getValue();
      if (!flags.length) return "—";
      return (
        <div className="flex flex-col gap-1">
          {flags.map((f) => (
            <RecommendationBadge key={f} action={f} />
          ))}
        </div>
      );
    },
  }),
  col.accessor("currentAcos", {
    header: "ACOS",
    cell: (info) => fmtPct(info.getValue()),
  }),
  col.accessor("currentBid", {
    header: "Bid",
    cell: (info) => fmtCurrency(info.getValue()),
  }),
  col.accessor("suggestedBid", {
    header: "Suggested",
    cell: (info) => {
      const v = info.getValue();
      return v != null ? (
        <span className="font-semibold text-primary">{fmtCurrency(v)}</span>
      ) : (
        "—"
      );
    },
  }),
  col.accessor("clicks", {
    header: "Clicks",
    cell: (info) => info.getValue()?.toLocaleString() ?? "—",
  }),
  col.accessor("spend", {
    header: "Spend",
    cell: (info) => fmtCurrency(info.getValue()),
  }),
  col.accessor("sales", {
    header: "Sales",
    cell: (info) => fmtCurrency(info.getValue()),
  }),
  col.accessor("organicRank", {
    header: "Organic Rank",
    cell: (info) => {
      const v = info.getValue();
      return v != null ? v : "—";
    },
  }),
  col.accessor("reason", {
    header: "Reason",
    cell: (info) => <span className="text-xs text-muted-foreground">{info.getValue()}</span>,
  }),
];

export function ResultsTable() {
  const results = useAppStore((s) => s.results);
  const activeFilter = useAppStore((s) => s.activeFilter);
  const [sorting, setSorting] = useState<SortingState>([]);

  const data = useMemo(() => {
    if (!results) return [];
    if (activeFilter === "ALL") return results.recommendations;
    return results.recommendations.filter(
      (r) => r.action === activeFilter || r.trendFlags.includes(activeFilter)
    );
  }, [results, activeFilter]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  if (!results) return null;

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="cursor-pointer select-none whitespace-nowrap"
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                  {{ asc: " ↑", desc: " ↓" }[header.column.getIsSorted() as string] ?? ""}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No results matching filter.
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="p-3 text-sm text-muted-foreground border-t">
        Showing {data.length} of {results.recommendations.length} keywords
      </div>
    </div>
  );
}
