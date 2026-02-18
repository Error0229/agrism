"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useFields } from "@/lib/store/fields-context";
import type { Field, FieldContext } from "@/lib/types";
import { defaultFieldContext } from "@/lib/utils/field-context";
import { Plus, Pencil } from "lucide-react";

interface FieldSettingsDialogProps {
  editField?: Field;
  occurredAt?: string;
}

export function FieldSettingsDialog({ editField, occurredAt }: FieldSettingsDialogProps) {
  const { addField, updateField } = useFields();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [width, setWidth] = useState("10");
  const [height, setHeight] = useState("5");
  const [plotType, setPlotType] = useState<FieldContext["plotType"]>(defaultFieldContext.plotType);
  const [sunHours, setSunHours] = useState<FieldContext["sunHours"]>(defaultFieldContext.sunHours);
  const [drainage, setDrainage] = useState<FieldContext["drainage"]>(defaultFieldContext.drainage);
  const [slope, setSlope] = useState<FieldContext["slope"]>(defaultFieldContext.slope);
  const [windExposure, setWindExposure] = useState<FieldContext["windExposure"]>(defaultFieldContext.windExposure);

  const isEdit = !!editField;
  const resetForm = () => {
    setName("");
    setWidth("10");
    setHeight("5");
    setPlotType(defaultFieldContext.plotType);
    setSunHours(defaultFieldContext.sunHours);
    setDrainage(defaultFieldContext.drainage);
    setSlope(defaultFieldContext.slope);
    setWindExposure(defaultFieldContext.windExposure);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && editField) {
      setName(editField.name);
      setWidth(String(editField.dimensions.width));
      setHeight(String(editField.dimensions.height));
      setPlotType(editField.context.plotType);
      setSunHours(editField.context.sunHours);
      setDrainage(editField.context.drainage);
      setSlope(editField.context.slope);
      setWindExposure(editField.context.windExposure);
    }
    if (!nextOpen && !isEdit) {
      resetForm();
    }
    setOpen(nextOpen);
  };

  const handleSubmit = () => {
    if (!name || !width || !height) return;
    const context: FieldContext = { plotType, sunHours, drainage, slope, windExposure };
    if (isEdit && editField) {
      updateField(editField.id, {
        name,
        dimensions: { width: parseFloat(width), height: parseFloat(height) },
        context,
      }, { occurredAt });
    } else {
      addField(name, parseFloat(width), parseFloat(height), { occurredAt, context });
    }
    setOpen(false);
    if (!isEdit) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">地塊類型</label>
              <Select value={plotType} onValueChange={(value) => setPlotType(value as FieldContext["plotType"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open_field">露地</SelectItem>
                  <SelectItem value="raised_bed">高畦</SelectItem>
                  <SelectItem value="container">容器</SelectItem>
                  <SelectItem value="greenhouse">溫室</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">日照時數</label>
              <Select value={sunHours} onValueChange={(value) => setSunHours(value as FieldContext["sunHours"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lt4">少於 4 小時</SelectItem>
                  <SelectItem value="h4_6">4-6 小時</SelectItem>
                  <SelectItem value="h6_8">6-8 小時</SelectItem>
                  <SelectItem value="gt8">8 小時以上</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">排水</label>
              <Select value={drainage} onValueChange={(value) => setDrainage(value as FieldContext["drainage"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="poor">差</SelectItem>
                  <SelectItem value="moderate">中</SelectItem>
                  <SelectItem value="good">佳</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">坡度</label>
              <Select value={slope} onValueChange={(value) => setSlope(value as FieldContext["slope"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="flat">平坦</SelectItem>
                  <SelectItem value="gentle">緩坡</SelectItem>
                  <SelectItem value="steep">陡坡</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">風勢</label>
              <Select
                value={windExposure}
                onValueChange={(value) => setWindExposure(value as FieldContext["windExposure"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sheltered">避風</SelectItem>
                  <SelectItem value="moderate">中等</SelectItem>
                  <SelectItem value="exposed">強風</SelectItem>
                </SelectContent>
              </Select>
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
