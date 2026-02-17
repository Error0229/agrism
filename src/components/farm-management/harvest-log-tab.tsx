"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFarmManagement } from "@/lib/store/farm-management-context";
import { useFields } from "@/lib/store/fields-context";
import { useAllCrops } from "@/lib/data/crop-lookup";
import { formatDate } from "@/lib/utils/date-helpers";
import { Plus, Trash2 } from "lucide-react";

export function HarvestLogTab() {
  const { harvestLogs, addHarvestLog, removeHarvestLog } = useFarmManagement();
  const { fields } = useFields();
  const allCrops = useAllCrops();

  const [fieldId, setFieldId] = useState("");
  const [cropId, setCropId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("公斤");
  const [notes, setNotes] = useState("");

  const handleAdd = () => {
    if (!fieldId || !cropId || !quantity) return;
    addHarvestLog({
      fieldId,
      cropId,
      date: new Date(date).toISOString(),
      quantity: parseFloat(quantity),
      unit,
      notes: notes || undefined,
    });
    setQuantity("");
    setNotes("");
  };

  const sorted = [...harvestLogs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const totalByUnit: Record<string, number> = {};
  harvestLogs.forEach((l) => {
    totalByUnit[l.unit] = (totalByUnit[l.unit] || 0) + l.quantity;
  });

  return (
    <div className="space-y-4 pt-4">
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
            <Select value={fieldId} onValueChange={setFieldId}>
              <SelectTrigger><SelectValue placeholder="田地" /></SelectTrigger>
              <SelectContent>
                {fields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cropId} onValueChange={setCropId}>
              <SelectTrigger><SelectValue placeholder="作物" /></SelectTrigger>
              <SelectContent>
                {allCrops.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.emoji} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input type="number" placeholder="數量" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="公斤">公斤</SelectItem>
                <SelectItem value="台斤">台斤</SelectItem>
                <SelectItem value="顆">顆</SelectItem>
                <SelectItem value="把">把</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleAdd} disabled={!fieldId || !cropId || !quantity}>
              <Plus className="size-4 mr-1" />新增
            </Button>
          </div>
          <Input className="mt-2" placeholder="備註（選填）" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </CardContent>
      </Card>

      {Object.keys(totalByUnit).length > 0 && (
        <div className="flex gap-4 text-sm">
          <span className="font-medium">總計：</span>
          {Object.entries(totalByUnit).map(([u, total]) => (
            <span key={u}>{total} {u}</span>
          ))}
        </div>
      )}

      {sorted.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日期</TableHead>
              <TableHead>田地</TableHead>
              <TableHead>作物</TableHead>
              <TableHead>數量</TableHead>
              <TableHead>備註</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((log) => {
              const crop = allCrops.find((c) => c.id === log.cropId);
              const field = fields.find((f) => f.id === log.fieldId);
              return (
                <TableRow key={log.id}>
                  <TableCell className="text-sm">{formatDate(log.date)}</TableCell>
                  <TableCell className="text-sm">{field?.name || "-"}</TableCell>
                  <TableCell className="text-sm">{crop?.emoji} {crop?.name || log.cropId}</TableCell>
                  <TableCell className="text-sm">{log.quantity} {log.unit}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{log.notes || "-"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => removeHarvestLog(log.id)}>
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      {sorted.length === 0 && (
        <p className="text-center text-muted-foreground py-8">尚無收成紀錄</p>
      )}
    </div>
  );
}
