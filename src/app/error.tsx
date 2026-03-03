"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <AlertTriangle className="size-12 text-destructive" />
      <h1 className="text-2xl font-bold">發生錯誤</h1>
      <p className="max-w-md text-muted-foreground">
        很抱歉，系統發生了非預期的錯誤。請重試或回到首頁。
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>
          重試
        </Button>
        <Button variant="outline" asChild>
          <Link href="/">回到首頁</Link>
        </Button>
      </div>
    </div>
  );
}
