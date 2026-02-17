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
import { FileUp, FileDown, Layers, Trash2 } from "lucide-react";

export function CropTemplateManager() {
  const {
    cropTemplates,
    saveCurrentAsTemplate,
    applyTemplate,
    exportTemplates,
    importTemplates,
    removeTemplate,
  } = useCustomCrops();

  const [open, setOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [importJson, setImportJson] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const handleSave = () => {
    const saved = saveCurrentAsTemplate(templateName);
    if (!saved) {
      setMessage("目前沒有可儲存的作物，或模板名稱為空。");
      return;
    }
    setTemplateName("");
    setMessage(`已儲存模板：${saved.name}`);
  };

  const handleApply = () => {
    if (!selectedTemplateId) return;
    const count = applyTemplate(selectedTemplateId);
    setMessage(count > 0 ? `已從模板新增 ${count} 種作物` : "模板中的作物已存在");
  };

  const handleExport = async () => {
    const content = exportTemplates();
    await navigator.clipboard.writeText(content);
    setMessage("模板 JSON 已複製到剪貼簿");
  };

  const handleImport = () => {
    try {
      const count = importTemplates(importJson);
      setMessage(count > 0 ? `已匯入 ${count} 個模板` : "未匯入任何模板");
      if (count > 0) setImportJson("");
    } catch {
      setMessage("模板 JSON 格式錯誤，請確認內容");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Layers className="size-4 mr-1" />
          作物模板
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>作物模板管理</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">儲存目前作物為模板</p>
            <div className="flex gap-2">
              <Input
                placeholder="例如：陽台葉菜模板"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
              />
              <Button onClick={handleSave} size="sm">
                儲存
              </Button>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">套用模板</p>
            <div className="flex gap-2">
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="選擇模板" />
                </SelectTrigger>
                <SelectContent>
                  {cropTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}（{template.crops.length} 種）
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleApply} size="sm" disabled={!selectedTemplateId}>
                套用
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={!selectedTemplateId}
                onClick={() => {
                  if (!selectedTemplateId) return;
                  removeTemplate(selectedTemplateId);
                  setSelectedTemplateId("");
                  setMessage("已刪除模板");
                }}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-sm font-medium">JSON 匯出/匯入</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExport}>
                <FileDown className="size-4 mr-1" />
                匯出到剪貼簿
              </Button>
            </div>
            <Textarea
              rows={5}
              placeholder="貼上模板 JSON 內容後點擊匯入"
              value={importJson}
              onChange={(e) => setImportJson(e.target.value)}
            />
            <Button size="sm" onClick={handleImport} disabled={!importJson.trim()}>
              <FileUp className="size-4 mr-1" />
              匯入模板
            </Button>
          </div>

          {message && <p className="text-xs text-muted-foreground">{message}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

