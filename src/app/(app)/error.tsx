"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("App route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle className="size-10 text-destructive" />
      <h1 className="text-xl font-bold">載入頁面時發生錯誤</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        請重新整理頁面，或回到首頁後再試一次。
      </p>
      <div className="flex gap-3">
        <Button variant="outline" size="sm" onClick={reset}>
          重新整理
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/">回到首頁</Link>
        </Button>
      </div>
    </div>
  );
}
