"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { MoreVertical, Pencil, Ruler, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateField, useDeleteField } from "@/hooks/use-fields";

interface FieldManageMenuProps {
  fieldId: string;
  farmId: string;
  fieldName: string;
  fieldWidthM: number;
  fieldHeightM: number;
}

export function FieldManageMenu({
  fieldId,
  farmId: _farmId,
  fieldName,
  fieldWidthM,
  fieldHeightM,
}: FieldManageMenuProps) {
  const router = useRouter();
  const updateField = useUpdateField();
  const deleteField = useDeleteField();

  const [renameOpen, setRenameOpen] = useState(false);
  const [resizeOpen, setResizeOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [newName, setNewName] = useState(fieldName);
  const [newWidth, setNewWidth] = useState(String(fieldWidthM));
  const [newHeight, setNewHeight] = useState(String(fieldHeightM));

  const handleRename = useCallback(async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    await updateField({ fieldId: fieldId as any, name: trimmed });
    setRenameOpen(false);
  }, [fieldId, newName, updateField]);

  const handleResize = useCallback(async () => {
    const w = parseFloat(newWidth);
    const h = parseFloat(newHeight);
    if (!w || w <= 0 || !h || h <= 0) return;
    await updateField({ fieldId: fieldId as any, widthM: w, heightM: h });
    setResizeOpen(false);
  }, [fieldId, newWidth, newHeight, updateField]);

  const handleDelete = useCallback(async () => {
    await deleteField({ fieldId: fieldId as any });
    router.push("/fields");
  }, [fieldId, deleteField, router]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-7">
            <MoreVertical className="size-4" />
            <span className="sr-only">田地管理選單</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem
            onSelect={() => {
              setNewName(fieldName);
              setRenameOpen(true);
            }}
          >
            <Pencil className="size-4" />
            重新命名
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setNewWidth(String(fieldWidthM));
              setNewHeight(String(fieldHeightM));
              setResizeOpen(true);
            }}
          >
            <Ruler className="size-4" />
            調整尺寸
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
            刪除田地
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Rename dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重新命名田地</DialogTitle>
            <DialogDescription>輸入新的田地名稱</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label htmlFor="field-name">名稱</Label>
            <Input
              id="field-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleRename}
              disabled={!newName.trim()}
            >
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resize dialog */}
      <Dialog open={resizeOpen} onOpenChange={setResizeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>調整田地尺寸</DialogTitle>
            <DialogDescription>設定田地的寬度與高度（公尺）</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="field-width">寬度 (m)</Label>
              <Input
                id="field-width"
                type="number"
                min="0.1"
                step="0.1"
                value={newWidth}
                onChange={(e) => setNewWidth(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="field-height">高度 (m)</Label>
              <Input
                id="field-height"
                type="number"
                min="0.1"
                step="0.1"
                value={newHeight}
                onChange={(e) => setNewHeight(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResizeOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleResize}
              disabled={
                !parseFloat(newWidth) ||
                parseFloat(newWidth) <= 0 ||
                !parseFloat(newHeight) ||
                parseFloat(newHeight) <= 0
              }
            >
              儲存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>確定要刪除田地嗎？</AlertDialogTitle>
            <AlertDialogDescription>
              刪除「{fieldName}」後，所有種植區域、設施和管線資料都將一併移除，此操作無法復原。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
            >
              刪除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
