"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropletIcon,
  Loader2,
  Plus,
  Sparkles,
  Check,
  SkipForward,
  Trash2,
} from "lucide-react";
import { useFarmId } from "@/hooks/use-farm-id";
import { useFields } from "@/hooks/use-fields";
import {
  useIrrigationZones,
  useCreateIrrigationZone,
  useMarkZoneWatered,
  useMarkZoneSkipped,
  useRemoveIrrigationZone,
  useGenerateIrrigationAdvice,
} from "@/hooks/use-irrigation";
import type { Id } from "../../../convex/_generated/dataModel";

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return "剛剛";
  if (minutes < 60) return `${minutes}分鐘前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小時前`;
  const days = Math.floor(hours / 24);
  return `${days}天前`;
}

function ZoneCard({
  zone,
  fieldName,
}: {
  zone: {
    _id: Id<"irrigationZones">;
    name: string;
    lastWateredAt?: number;
    skipReason?: string;
    linkedRegionIds?: string[];
    notes?: string;
  };
  fieldName: string;
}) {
  const markWatered = useMarkZoneWatered();
  const markSkipped = useMarkZoneSkipped();
  const removeZone = useRemoveIrrigationZone();
  const [loading, setLoading] = useState<string | null>(null);

  const handleWatered = async () => {
    setLoading("water");
    try {
      await markWatered({ zoneId: zone._id });
    } finally {
      setLoading(null);
    }
  };

  const handleSkip = async () => {
    setLoading("skip");
    try {
      await markSkipped({ zoneId: zone._id, reason: "手動跳過" });
    } finally {
      setLoading(null);
    }
  };

  const handleRemove = async () => {
    setLoading("remove");
    try {
      await removeZone({ zoneId: zone._id });
    } finally {
      setLoading(null);
    }
  };

  const regionCount = zone.linkedRegionIds?.length ?? 0;

  return (
    <div className="flex items-center justify-between rounded-lg border p-3 gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <DropletIcon className="size-4 text-blue-500 shrink-0" />
          <span className="font-medium truncate">{zone.name}</span>
          <Badge variant="outline" className="text-xs shrink-0">
            {fieldName}
          </Badge>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          {zone.lastWateredAt ? (
            <span>上次澆水：{timeAgo(zone.lastWateredAt)}</span>
          ) : (
            <span>尚未記錄澆水</span>
          )}
          {regionCount > 0 && <span>{regionCount} 個種植區域</span>}
          {zone.skipReason && (
            <Badge variant="secondary" className="text-xs">
              已跳過
            </Badge>
          )}
        </div>
        {zone.notes && (
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {zone.notes}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="outline"
          size="sm"
          onClick={handleWatered}
          disabled={loading !== null}
          title="已澆水"
        >
          {loading === "water" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          <span className="ml-1 hidden sm:inline">已澆水</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          disabled={loading !== null}
          title="跳過"
        >
          {loading === "skip" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <SkipForward className="size-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          disabled={loading !== null}
          title="刪除"
          className="text-destructive hover:text-destructive"
        >
          {loading === "remove" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trash2 className="size-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

function CreateZoneDialog({ farmId }: { farmId: Id<"farms"> }) {
  const fields = useFields(farmId);
  const createZone = useCreateIrrigationZone();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [fieldId, setFieldId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !fieldId) return;
    setSaving(true);
    try {
      await createZone({
        farmId,
        fieldId: fieldId as Id<"fields">,
        name,
        notes: notes || undefined,
      });
      setName("");
      setFieldId("");
      setNotes("");
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-1 size-4" />
          新增區域
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新增灌溉區域</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="zone-name">區域名稱</Label>
            <Input
              id="zone-name"
              placeholder="例：A區水管、東側灌溉"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="zone-field">田區</Label>
            <Select value={fieldId} onValueChange={setFieldId}>
              <SelectTrigger>
                <SelectValue placeholder="選擇田區" />
              </SelectTrigger>
              <SelectContent>
                {fields?.map((f) => (
                  <SelectItem key={f._id} value={f._id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="zone-notes">備註</Label>
            <Input
              id="zone-notes"
              placeholder="選填"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={saving || !name || !fieldId}>
            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
            建立
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function IrrigationPanel() {
  const farmId = useFarmId();
  const zones = useIrrigationZones(farmId as Id<"farms"> | undefined);
  const fields = useFields(farmId as Id<"farms"> | undefined);
  const generateAdvice = useGenerateIrrigationAdvice();
  const [generating, setGenerating] = useState(false);
  const [adviceResult, setAdviceResult] = useState<string | null>(null);

  const handleGenerateAdvice = async () => {
    if (!farmId) return;
    setGenerating(true);
    setAdviceResult(null);
    try {
      const result = await generateAdvice({
        farmId: farmId as Id<"farms">,
      });
      setAdviceResult(
        result.count > 0
          ? `已生成 ${result.count} 條灌溉建議`
          : result.message ?? "目前無需特別灌溉"
      );
    } catch (err) {
      setAdviceResult("生成建議失敗，請稍後再試");
    } finally {
      setGenerating(false);
    }
  };

  // Build field name lookup
  const fieldNameMap = new Map<string, string>();
  fields?.forEach((f) => fieldNameMap.set(f._id, f.name));

  // Group zones by field
  const grouped = new Map<string, typeof zones>();
  zones?.forEach((zone) => {
    const key = zone.fieldId;
    const existing = grouped.get(key) ?? [];
    existing.push(zone);
    grouped.set(key, existing);
  });

  if (!farmId) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DropletIcon className="size-5 text-blue-500" />
              灌溉管理
            </CardTitle>
            <CardDescription>管理灌溉區域與澆水記錄</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateAdvice}
              disabled={generating || !zones || zones.length === 0}
            >
              {generating ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Sparkles className="mr-1 size-4" />
              )}
              生成灌溉建議
            </Button>
            <CreateZoneDialog farmId={farmId as Id<"farms">} />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {adviceResult && (
          <div className="mb-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 p-3 text-sm">
            {adviceResult}
          </div>
        )}

        {zones === undefined ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : zones.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">
            尚未設定灌溉區域。點擊「新增區域」開始管理灌溉。
          </p>
        ) : (
          <div className="space-y-4">
            {[...grouped.entries()].map(([fieldId, fieldZones]) => (
              <div key={fieldId}>
                <h4 className="text-sm font-medium text-muted-foreground mb-2">
                  {fieldNameMap.get(fieldId) ?? "未知田區"}
                </h4>
                <div className="space-y-2">
                  {fieldZones!.map((zone) => (
                    <ZoneCard
                      key={zone._id}
                      zone={zone}
                      fieldName={
                        fieldNameMap.get(zone.fieldId) ?? "未知"
                      }
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
