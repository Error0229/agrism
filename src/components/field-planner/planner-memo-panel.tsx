"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useLocalStorage } from "@/hooks/use-local-storage";

interface PlannerMemoState {
  text: string;
  updatedAt: string;
}

const defaultMemoState: PlannerMemoState = {
  text: "",
  updatedAt: "",
};

function formatUpdatedAt(value: string) {
  if (!value) return "尚未更新";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "尚未更新";
  return format(date, "yyyy/MM/dd HH:mm");
}

export function PlannerMemoPanel() {
  const [memo, setMemo, isLoaded] = useLocalStorage<PlannerMemoState>("hualien-planner-memo", defaultMemoState);

  const characterCount = useMemo(() => memo.text.length, [memo.text]);

  if (!isLoaded) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">庭園 Memo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">載入中...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">庭園 Memo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Textarea
          value={memo.text}
          onChange={(event) =>
            setMemo({
              text: event.target.value,
              updatedAt: new Date().toISOString(),
            })
          }
          placeholder="記錄庭園配置備註、設備保養提醒、道路/水電注意事項..."
          rows={5}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>最後更新：{formatUpdatedAt(memo.updatedAt)}</span>
          <span>{characterCount} 字</span>
        </div>
      </CardContent>
    </Card>
  );
}
