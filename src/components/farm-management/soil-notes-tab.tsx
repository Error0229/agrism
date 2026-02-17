"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFarmManagement } from "@/lib/store/farm-management-context";
import { useFields } from "@/lib/store/fields-context";
import { formatDate } from "@/lib/utils/date-helpers";
import { Plus, Trash2 } from "lucide-react";

export function SoilNotesTab() {
  const { soilNotes, addSoilNote, removeSoilNote } = useFarmManagement();
  const { fields } = useFields();

  const [fieldId, setFieldId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [ph, setPh] = useState("");
  const [content, setContent] = useState("");

  const handleAdd = () => {
    if (!fieldId || !content) return;
    addSoilNote({
      fieldId,
      date: new Date(date).toISOString(),
      ph: ph ? parseFloat(ph) : undefined,
      content,
    });
    setContent("");
    setPh("");
  };

  const sorted = [...soilNotes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-4 pt-4">
      <Card>
        <CardContent className="pt-6 space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
            <Select value={fieldId} onValueChange={setFieldId}>
              <SelectTrigger><SelectValue placeholder="選擇田地" /></SelectTrigger>
              <SelectContent>
                {fields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input type="number" step="0.1" min="0" max="14" placeholder="pH 值（選填）" value={ph} onChange={(e) => setPh(e.target.value)} />
            <Button onClick={handleAdd} disabled={!fieldId || !content}>
              <Plus className="size-4 mr-1" />新增
            </Button>
          </div>
          <Textarea placeholder="土壤觀察紀錄..." value={content} onChange={(e) => setContent(e.target.value)} rows={2} />
        </CardContent>
      </Card>

      <div className="space-y-3">
        {sorted.map((note) => {
          const field = fields.find((f) => f.id === note.fieldId);
          return (
            <Card key={note.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium">{field?.name || "未知田地"}</span>
                      <span className="text-muted-foreground">{formatDate(note.date)}</span>
                      {note.ph && <span className="text-xs bg-muted px-2 py-0.5 rounded">pH {note.ph}</span>}
                    </div>
                    <p className="text-sm mt-1">{note.content}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeSoilNote(note.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <p className="text-center text-muted-foreground py-8">尚無土壤紀錄</p>
      )}
    </div>
  );
}
