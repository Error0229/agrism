"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface Envelope {
  source: string;
  freshness: "fresh" | "stale" | "expired";
  confidence: {
    score: number;
    level: "low" | "medium" | "high";
  };
}

interface IntegrationOverview {
  climate: Envelope | null;
  market: Envelope | null;
  sensor: Envelope | null;
  errors: string[];
}

function rowLabel(key: "climate" | "market" | "sensor") {
  if (key === "climate") return "氣候資料";
  if (key === "market") return "行情資料";
  return "感測資料";
}

export function IntegrationStatus() {
  const [overview, setOverview] = useState<IntegrationOverview | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integration/overview");
      if (!res.ok) throw new Error("fetch failed");
      const data = (await res.json()) as IntegrationOverview;
      setOverview(data);
    } catch {
      setOverview({
        climate: null,
        market: null,
        sensor: null,
        errors: ["整合資料來源暫時不可用"],
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">外部資料整合狀態</CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchOverview} disabled={loading}>
            <RefreshCw className={`size-3 mr-1 ${loading ? "animate-spin" : ""}`} />
            更新
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {(["climate", "market", "sensor"] as const).map((key) => {
          const item = overview?.[key] ?? null;
          return (
            <div key={key} className="rounded border p-2 text-sm">
              <p className="font-medium">{rowLabel(key)}</p>
              {item ? (
                <p className="text-muted-foreground">
                  {item.source} ・ 新鮮度 {item.freshness} ・ 信心 {item.confidence.score}/100 ({item.confidence.level})
                </p>
              ) : (
                <p className="text-muted-foreground">目前無可用資料</p>
              )}
            </div>
          );
        })}
        {overview?.errors?.length ? <p className="text-xs text-muted-foreground">{overview.errors.join("；")}</p> : null}
      </CardContent>
    </Card>
  );
}
