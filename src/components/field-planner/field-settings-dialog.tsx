"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFields } from "@/lib/store/fields-context";
import type { Field } from "@/lib/types";
import { Plus, Pencil } from "lucide-react";

interface FieldSettingsDialogProps {
  editField?: Field;
}

export function FieldSettingsDialog({ editField }: FieldSettingsDialogProps) {
  const { addField, updateField } = useFields();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [width, setWidth] = useState("10");
  const [height, setHeight] = useState("5");

  const isEdit = !!editField;

  useEffect(() => {
    if (editField && open) {
      setName(editField.name);
      setWidth(String(editField.dimensions.width));
      setHeight(String(editField.dimensions.height));
    }
  }, [editField, open]);

  const handleSubmit = () => {
    if (!name || !width || !height) return;
    if (isEdit && editField) {
      updateField(editField.id, {
        name,
        dimensions: { width: parseFloat(width), height: parseFloat(height) },
      });
    } else {
      addField(name, parseFloat(width), parseFloat(height));
    }
    setOpen(false);
    if (!isEdit) {
      setName("");
      setWidth("10");
      setHeight("5");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button size="sm" variant="ghost">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button size="sm" variant="outline">
            <Plus className="size-4 mr-1" />
            新增田地
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "編輯田地" : "新增田地"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">田地名稱</label>
            <Input
              placeholder="例如：後院菜園"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">寬度（公尺）</label>
              <Input
                type="number"
                min="1"
                max="100"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">長度（公尺）</label>
              <Input
                type="number"
                min="1"
                max="100"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={!name} className="w-full">
            {isEdit ? "儲存變更" : "建立田地"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
