"use client";

import React, { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface DropZoneProps {
  accept: string; // e.g. ".xlsx" or ".csv"
  label: string;
  onFiles: (files: File[]) => void;
}

export function DropZone({ accept, label, onFiles }: DropZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) => {
        const ext = f.name.split(".").pop()?.toLowerCase();
        return accept.includes(`.${ext}`);
      });
      if (files.length) onFiles(files);
    },
    [accept, onFiles]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length) onFiles(files);
      if (inputRef.current) inputRef.current.value = "";
    },
    [onFiles]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-primary/50"
      )}
    >
      <svg className="h-10 w-10 text-muted-foreground mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
      </svg>
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground mt-1">
        Drag & drop or click to browse ({accept})
      </p>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleChange}
        className="hidden"
      />
    </div>
  );
}
