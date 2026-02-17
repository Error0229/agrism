"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { useCustomCrops } from "@/lib/store/custom-crops-context";
import { CropCategory, WaterLevel, SunlightLevel } from "@/lib/types";
import { Plus, Sparkles, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export function CustomCropDialog() {
  const { addCustomCrop } = useCustomCrops();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cropName, setCropName] = useState("");

  // Form fields
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🌱");
  const [color, setColor] = useState("#16a34a");
  const [category, setCategory] = useState<string>("");
  const [plantingMonths, setPlantingMonths] = useState<number[]>([]);
  const [harvestMonths, setHarvestMonths] = useState<number[]>([]);
  const [growthDays, setGrowthDays] = useState("90");
  const [rowSpacing, setRowSpacing] = useState("50");
  const [plantSpacing, setPlantSpacing] = useState("30");
  const [water, setWater] = useState<string>(WaterLevel.適量);
  const [sunlight, setSunlight] = useState<string>(SunlightLevel.全日照);
  const [tempMin, setTempMin] = useState("18");
  const [tempMax, setTempMax] = useState("30");
  const [fertilizerDays, setFertilizerDays] = useState("14");
  const [needsPruning, setNeedsPruning] = useState(false);
  const [pruningMonths, setPruningMonths] = useState<number[]>([]);
  const [pestControl, setPestControl] = useState("");
  const [typhoonResistance, setTyphoonResistance] = useState<"低" | "中" | "高">("中");
  const [hualienNotes, setHualienNotes] = useState("");
  const [aiError, setAiError] = useState("");

  const toggleMonth = (month: number, target: "planting" | "harvest" | "pruning") => {
    const setter = target === "planting" ? setPlantingMonths : target === "harvest" ? setHarvestMonths : setPruningMonths;
    const current = target === "planting" ? plantingMonths : target === "harvest" ? harvestMonths : pruningMonths;
    setter(current.includes(month) ? current.filter((m) => m !== month) : [...current, month]);
  };

  const handleAiSearch = async () => {
    if (!cropName.trim()) return;
    setLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/crop-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cropName: cropName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setAiError(data.error || "查詢失敗");
        return;
      }
      const data = await res.json();
      setName(data.name || cropName);
      setEmoji(data.emoji || "🌱");
      setColor(data.color || "#16a34a");
      setCategory(data.category || "");
      setPlantingMonths(data.plantingMonths || []);
      setHarvestMonths(data.harvestMonths || []);
      setGrowthDays(String(data.growthDays || 90));
      setRowSpacing(String(data.spacing?.row || 50));
      setPlantSpacing(String(data.spacing?.plant || 30));
      setWater(data.water || WaterLevel.適量);
      setSunlight(data.sunlight || SunlightLevel.全日照);
      setTempMin(String(data.temperatureRange?.min || 18));
      setTempMax(String(data.temperatureRange?.max || 30));
      setFertilizerDays(String(data.fertilizerIntervalDays || 14));
      setNeedsPruning(data.needsPruning || false);
      setPruningMonths(data.pruningMonths || []);
      setPestControl(Array.isArray(data.pestControl) ? data.pestControl.join("\n") : "");
      setTyphoonResistance(data.typhoonResistance || "中");
      setHualienNotes(data.hualienNotes || "");
    } catch {
      setAiError("網路錯誤，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (!name || !category) return;
    addCustomCrop({
      name,
      emoji,
      color,
      category: category as CropCategory,
      plantingMonths,
      harvestMonths,
      growthDays: parseInt(growthDays) || 90,
      spacing: { row: parseInt(rowSpacing) || 50, plant: parseInt(plantSpacing) || 30 },
      water: water as WaterLevel,
      sunlight: sunlight as SunlightLevel,
      temperatureRange: { min: parseInt(tempMin) || 18, max: parseInt(tempMax) || 30 },
      fertilizerIntervalDays: parseInt(fertilizerDays) || 14,
      needsPruning,
      pruningMonths: needsPruning ? pruningMonths : undefined,
      pestControl: pestControl.split("\n").filter(Boolean),
      typhoonResistance,
      hualienNotes,
    });
    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setCropName("");
    setName("");
    setEmoji("🌱");
    setColor("#16a34a");
    setCategory("");
    setPlantingMonths([]);
    setHarvestMonths([]);
    setGrowthDays("90");
    setRowSpacing("50");
    setPlantSpacing("30");
    setWater(WaterLevel.適量);
    setSunlight(SunlightLevel.全日照);
    setTempMin("18");
    setTempMax("30");
    setFertilizerDays("14");
    setNeedsPruning(false);
    setPruningMonths([]);
    setPestControl("");
    setTyphoonResistance("中");
    setHualienNotes("");
    setAiError("");
  };

  const MonthSelector = ({ selected, target }: { selected: number[]; target: "planting" | "harvest" | "pruning" }) => (
    <div className="grid grid-cols-6 gap-1">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => toggleMonth(m, target)}
          className={`text-xs px-1 py-1 rounded border transition-colors ${
            selected.includes(m) ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"
          }`}
        >
          {m}月
        </button>
      ))}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="size-4 mr-1" />
          新增自訂品種
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>新增自訂作物</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-4">
            {/* AI Search */}
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
              <p className="text-sm font-medium flex items-center gap-1">
                <Sparkles className="size-4 text-amber-500" />
                AI 智慧填入
              </p>
              <p className="text-xs text-muted-foreground">輸入作物名稱，AI 將自動查詢並填入所有資訊</p>
              <div className="flex gap-2">
                <Input
                  placeholder="輸入作物名稱，如：草莓、西瓜..."
                  value={cropName}
                  onChange={(e) => setCropName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleAiSearch(); }}
                />
                <Button onClick={handleAiSearch} disabled={loading || !cropName.trim()} size="sm" className="shrink-0">
                  {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {loading ? "查詢中" : "AI 查詢"}
                </Button>
              </div>
              {aiError && <p className="text-xs text-destructive">{aiError}</p>}
            </div>

            {/* Basic info */}
            <div className="grid grid-cols-[1fr_auto_auto] gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">名稱</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="作物名稱" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Emoji</label>
                <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-16 text-center" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">顏色</label>
                <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-16 h-9 p-1" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">分類</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue placeholder="選擇分類" /></SelectTrigger>
                <SelectContent>
                  {Object.values(CropCategory).map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Months */}
            <div className="space-y-1">
              <label className="text-xs font-medium">播種月份</label>
              <MonthSelector selected={plantingMonths} target="planting" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">收成月份</label>
              <MonthSelector selected={harvestMonths} target="harvest" />
            </div>

            {/* Growth */}
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">生長天數</label>
                <Input type="number" value={growthDays} onChange={(e) => setGrowthDays(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">行距(cm)</label>
                <Input type="number" value={rowSpacing} onChange={(e) => setRowSpacing(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">株距(cm)</label>
                <Input type="number" value={plantSpacing} onChange={(e) => setPlantSpacing(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">水分需求</label>
                <Select value={water} onValueChange={setWater}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(WaterLevel).map((w) => (
                      <SelectItem key={w} value={w}>{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">日照需求</label>
                <Select value={sunlight} onValueChange={setSunlight}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(SunlightLevel).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">最低適溫</label>
                <Input type="number" value={tempMin} onChange={(e) => setTempMin(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">最高適溫</label>
                <Input type="number" value={tempMax} onChange={(e) => setTempMax(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">施肥間隔(天)</label>
                <Input type="number" value={fertilizerDays} onChange={(e) => setFertilizerDays(e.target.value)} />
              </div>
            </div>

            {/* Pruning */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium">
                <input type="checkbox" checked={needsPruning} onChange={(e) => setNeedsPruning(e.target.checked)} className="rounded" />
                需要剪枝
              </label>
              {needsPruning && (
                <div className="space-y-1">
                  <label className="text-xs font-medium">剪枝月份</label>
                  <MonthSelector selected={pruningMonths} target="pruning" />
                </div>
              )}
            </div>

            {/* Pest control */}
            <div className="space-y-1">
              <label className="text-xs font-medium">病蟲害防治（每行一項，格式：名稱：防治方法）</label>
              <Textarea value={pestControl} onChange={(e) => setPestControl(e.target.value)} rows={3} placeholder="蚜蟲：噴施苦楝油" />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">颱風耐受度</label>
              <Select value={typhoonResistance} onValueChange={(v) => setTyphoonResistance(v as "低" | "中" | "高")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="低">低</SelectItem>
                  <SelectItem value="中">中</SelectItem>
                  <SelectItem value="高">高</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium">花蓮種植注意事項</label>
              <Textarea value={hualienNotes} onChange={(e) => setHualienNotes(e.target.value)} rows={2} />
            </div>

            <Button onClick={handleSubmit} disabled={!name || !category} className="w-full">
              儲存自訂品種
            </Button>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
