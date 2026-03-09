"use client";

import { ExternalLink } from "lucide-react";

interface CropImageAttributionProps {
  sourceUrl?: string | null;
  author?: string | null;
  license?: string | null;
}

export function CropImageAttribution({
  sourceUrl,
  author,
  license,
}: CropImageAttributionProps) {
  if (!sourceUrl && !author && !license) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>圖片來源</span>
      {author && <span>{author}</span>}
      {license && <span>{license}</span>}
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
        >
          Wikimedia Commons
          <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  );
}
