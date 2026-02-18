"use client";

import { useMemo, useState } from "react";
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
import { defaultSoilTexture, summarizeSoilRiskFlags } from "@/lib/utils/soil-profile";
import type { SoilTexture } from "@/lib/types";
import { Plus, Trash2 } from "lucide-react";

export function SoilNotesTab() {
  const {
    soilNotes,
    soilProfiles,
    soilAmendments,
    addSoilNote,
    removeSoilNote,
    upsertSoilProfile,
    removeSoilProfile,
    addSoilAmendment,
    removeSoilAmendment,
  } = useFarmManagement();
  const { fields } = useFields();

  const [fieldId, setFieldId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [ph, setPh] = useState("");
  const [content, setContent] = useState("");
  const [texture, setTexture] = useState<SoilTexture>(defaultSoilTexture);
  const [profilePh, setProfilePh] = useState("");
  const [profileEc, setProfileEc] = useState("");
  const [organicMatterPct, setOrganicMatterPct] = useState("");
  const [amendmentDate, setAmendmentDate] = useState(new Date().toISOString().split("T")[0]);
  const [amendmentType, setAmendmentType] = useState("");
  const [amendmentQuantity, setAmendmentQuantity] = useState("");
  const [amendmentUnit, setAmendmentUnit] = useState("kg");
  const [amendmentNotes, setAmendmentNotes] = useState("");

  const selectedField = fields.find((field) => field.id === fieldId);
  const selectedProfile = soilProfiles.find((profile) => profile.fieldId === fieldId);
  const selectedRiskFlags = selectedProfile ? summarizeSoilRiskFlags(selectedProfile) : [];

  const applyProfileToForm = (profile?: (typeof soilProfiles)[number]) => {
    if (!profile) {
      setTexture(defaultSoilTexture);
      setProfilePh("");
      setProfileEc("");
      setOrganicMatterPct("");
      return;
    }

    setTexture(profile.texture);
    setProfilePh(profile.ph === null ? "" : String(profile.ph));
    setProfileEc(profile.ec === null ? "" : String(profile.ec));
    setOrganicMatterPct(profile.organicMatterPct === null ? "" : String(profile.organicMatterPct));
  };

  const handleFieldChange = (nextFieldId: string) => {
    setFieldId(nextFieldId);
    const profile = soilProfiles.find((item) => item.fieldId === nextFieldId);
    applyProfileToForm(profile);
  };

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

  const handleSaveProfile = () => {
    if (!fieldId) return;
    upsertSoilProfile({
      fieldId,
      texture,
      ph: profilePh ? parseFloat(profilePh) : null,
      ec: profileEc ? parseFloat(profileEc) : null,
      organicMatterPct: organicMatterPct ? parseFloat(organicMatterPct) : null,
    });
  };

  const handleAddAmendment = () => {
    if (!fieldId || !amendmentType || !amendmentQuantity) return;
    addSoilAmendment({
      fieldId,
      date: new Date(amendmentDate).toISOString(),
      amendmentType,
      quantity: parseFloat(amendmentQuantity),
      unit: amendmentUnit,
      notes: amendmentNotes || undefined,
    });
    setAmendmentType("");
    setAmendmentQuantity("");
    setAmendmentNotes("");
  };

  const sorted = [...soilNotes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const fieldAmendments = useMemo(
    () =>
      soilAmendments
        .filter((item) => item.fieldId === fieldId)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [soilAmendments, fieldId]
  );

  return (
    <div className="space-y-4 pt-4">
      <Card>
        <CardContent className="pt-6 space-y-3">
          <p className="text-sm font-medium">土壤剖面</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
            <Select value={fieldId} onValueChange={handleFieldChange}>
              <SelectTrigger><SelectValue placeholder="選擇田地" /></SelectTrigger>
              <SelectContent>
                {fields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={texture} onValueChange={(value) => setTexture(value as SoilTexture)}>
              <SelectTrigger><SelectValue placeholder="土壤質地" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sand">砂質</SelectItem>
                <SelectItem value="loam">壤土</SelectItem>
                <SelectItem value="clay">黏土</SelectItem>
                <SelectItem value="silty">粉土</SelectItem>
                <SelectItem value="mixed">混合</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" step="0.1" min="0" max="14" placeholder="pH 值" value={profilePh} onChange={(e) => setProfilePh(e.target.value)} />
            <Input type="number" step="0.1" min="0" max="20" placeholder="EC (mS/cm)" value={profileEc} onChange={(e) => setProfileEc(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-end">
            <Input
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="有機質 (%)"
              value={organicMatterPct}
              onChange={(e) => setOrganicMatterPct(e.target.value)}
            />
            <Button onClick={handleSaveProfile} disabled={!fieldId}>
              儲存土壤剖面
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (!fieldId) return;
                removeSoilProfile(fieldId);
                applyProfileToForm(undefined);
              }}
              disabled={!selectedProfile}
            >
              清除剖面
            </Button>
          </div>
          {selectedProfile && (
            <div className="rounded-md border p-3 text-sm space-y-1">
              <p className="text-muted-foreground">
                {selectedField?.name || "田地"} 更新時間：{formatDate(selectedProfile.updatedAt)}
              </p>
              {selectedRiskFlags.length === 0 ? (
                <p>目前無明顯風險指標。</p>
              ) : (
                <ul className="list-disc pl-5 space-y-1">
                  {selectedRiskFlags.map((flag) => (
                    <li key={flag}>{flag}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <p className="text-sm font-medium">改良紀錄</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
            <Select value={fieldId} onValueChange={handleFieldChange}>
              <SelectTrigger><SelectValue placeholder="選擇田地" /></SelectTrigger>
              <SelectContent>
                {fields.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input type="date" value={amendmentDate} onChange={(e) => setAmendmentDate(e.target.value)} />
            <Input placeholder="改良資材（例：堆肥）" value={amendmentType} onChange={(e) => setAmendmentType(e.target.value)} />
            <Input type="number" step="0.1" min="0" placeholder="數量" value={amendmentQuantity} onChange={(e) => setAmendmentQuantity(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[8rem_1fr_auto] gap-2 items-end">
            <Input value={amendmentUnit} onChange={(e) => setAmendmentUnit(e.target.value)} placeholder="單位（kg）" />
            <Input value={amendmentNotes} onChange={(e) => setAmendmentNotes(e.target.value)} placeholder="備註（選填）" />
            <Button onClick={handleAddAmendment} disabled={!fieldId || !amendmentType || !amendmentQuantity}>
              <Plus className="size-4 mr-1" />新增
            </Button>
          </div>
          <div className="space-y-2">
            {fieldAmendments.length === 0 ? (
              <p className="text-sm text-muted-foreground">此田地尚無改良紀錄</p>
            ) : (
              fieldAmendments.map((item) => (
                <div key={item.id} className="rounded-md border p-3 text-sm flex items-start justify-between">
                  <div>
                    <p className="font-medium">{item.amendmentType}</p>
                    <p className="text-muted-foreground">
                      {formatDate(item.date)} ・ {item.quantity} {item.unit}
                    </p>
                    {item.notes && <p className="mt-1">{item.notes}</p>}
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeSoilAmendment(item.id)}>
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-2">
          <p className="text-sm font-medium">土壤觀察紀錄</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 items-end">
            <Select value={fieldId} onValueChange={handleFieldChange}>
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
