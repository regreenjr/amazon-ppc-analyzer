"use client";

import { useAppStore } from "@/store/app-store";
import { DropZone } from "./DropZone";
import { FileList } from "./FileList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadedFile } from "@/types";

export function FileUploadSection() {
  const {
    ppcFiles, sqpFiles, organicFiles,
    addPPCFile, addSQPFile, addOrganicFile,
    removePPCFile, removeSQPFile, removeOrganicFile,
  } = useAppStore();

  const handlePPCFiles = (files: File[]) => {
    files.forEach((file) => {
      const uploaded: UploadedFile = {
        id: `ppc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        type: "ppc",
        file,
      };
      addPPCFile(uploaded);
    });
  };

  const handleSQPFiles = (files: File[]) => {
    files.forEach((file) => {
      const uploaded: UploadedFile = {
        id: `sqp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        type: "sqp",
        file,
      };
      addSQPFile(uploaded);
    });
  };

  const handleOrganicFiles = (files: File[]) => {
    files.forEach((file) => {
      const uploaded: UploadedFile = {
        id: `organic-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: file.name,
        type: "organic",
        file,
      };
      addOrganicFile(uploaded);
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">PPC Bulk Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <DropZone accept=".xlsx,.csv" label="Upload PPC Bulk Reports" onFiles={handlePPCFiles} />
          <FileList files={ppcFiles} onRemove={removePPCFile} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">SQP Weekly Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <DropZone accept=".csv" label="Upload SQP Weekly CSVs" onFiles={handleSQPFiles} />
          <FileList files={sqpFiles} onRemove={removeSQPFile} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Organic Rankings</CardTitle>
        </CardHeader>
        <CardContent>
          <DropZone accept=".xlsx,.csv" label="Upload Organic Ranking Data" onFiles={handleOrganicFiles} />
          <FileList files={organicFiles} onRemove={removeOrganicFile} />
        </CardContent>
      </Card>
    </div>
  );
}
