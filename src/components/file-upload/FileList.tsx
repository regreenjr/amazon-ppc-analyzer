"use client";

import { Button } from "@/components/ui/button";
import { UploadedFile } from "@/types";

interface FileListProps {
  files: UploadedFile[];
  onRemove: (id: string) => void;
}

export function FileList({ files, onRemove }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <ul className="mt-3 space-y-1">
      {files.map((f) => (
        <li key={f.id} className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
          <span className="truncate mr-2">{f.name}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(f.id)}
          >
            &times;
          </Button>
        </li>
      ))}
    </ul>
  );
}
