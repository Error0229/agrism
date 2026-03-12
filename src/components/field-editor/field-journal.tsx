"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  BookOpen,
  Camera,
  Mic,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { JournalCategory } from "@/lib/types/enums";
import {
  JOURNAL_CATEGORY_LABELS,
  JOURNAL_CATEGORY_ICONS,
} from "@/lib/types/labels";
import { JOURNAL_QUICK_PHRASES } from "@/lib/config/journal-quick-phrases";
import { formatRelativeTime } from "@/lib/utils/relative-time";
import {
  useFieldJournal,
  useCreateFieldJournalEntry,
  useUpdateFieldJournalEntry,
  useDeleteFieldJournalEntry,
} from "@/hooks/use-journal";
import type { Id } from "../../../convex/_generated/dataModel";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = [
  JournalCategory.GROWTH,
  JournalCategory.PEST,
  JournalCategory.SOIL,
  JournalCategory.HARVEST,
  JournalCategory.WEATHER,
  JournalCategory.GENERAL,
] as const;

const CATEGORY_COLORS: Record<JournalCategory, string> = {
  growth: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
  pest: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  soil: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800",
  harvest: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  weather: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800",
  general: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700",
};

const CATEGORY_ACTIVE_COLORS: Record<JournalCategory, string> = {
  growth: "bg-emerald-500 text-white border-emerald-600 dark:bg-emerald-600 dark:border-emerald-500",
  pest: "bg-red-500 text-white border-red-600 dark:bg-red-600 dark:border-red-500",
  soil: "bg-amber-500 text-white border-amber-600 dark:bg-amber-600 dark:border-amber-500",
  harvest: "bg-yellow-500 text-white border-yellow-600 dark:bg-yellow-600 dark:border-yellow-500",
  weather: "bg-sky-500 text-white border-sky-600 dark:bg-sky-600 dark:border-sky-500",
  general: "bg-slate-500 text-white border-slate-600 dark:bg-slate-600 dark:border-slate-500",
};

const SIDEBAR_ENTRY_LIMIT = 3;

// ---------------------------------------------------------------------------
// FieldJournal component
// ---------------------------------------------------------------------------

interface FieldJournalProps {
  fieldId: Id<"fields">;
  fieldName?: string;
}

export const FieldJournal = React.memo(function FieldJournal({
  fieldId,
  fieldName,
}: FieldJournalProps) {
  const entries = useFieldJournal(fieldId);
  const createEntry = useCreateFieldJournalEntry();
  const updateEntry = useUpdateFieldJournalEntry();
  const deleteEntry = useDeleteFieldJournalEntry();

  const [formOpen, setFormOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<JournalCategory | null>(null);
  const [content, setContent] = useState("");
  const [selectedPhrases, setSelectedPhrases] = useState<string[]>([]);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<JournalCategory | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // --- Handlers ---

  const handleCategoryTap = useCallback((category: JournalCategory) => {
    setSelectedCategory(category);
    setFormOpen(true);
    setContent("");
    setSelectedPhrases([]);
    setEditingEntryId(null);
    // Focus textarea after render
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  const handlePhraseTap = useCallback((phrase: string) => {
    setContent((prev) => {
      const separator = prev.length > 0 && !prev.endsWith("，") && !prev.endsWith(" ") ? "，" : "";
      return prev + separator + phrase;
    });
    setSelectedPhrases((prev) =>
      prev.includes(phrase) ? prev : [...prev, phrase],
    );
    textareaRef.current?.focus();
  }, []);

  const handleCancel = useCallback(() => {
    setFormOpen(false);
    setSelectedCategory(null);
    setContent("");
    setSelectedPhrases([]);
    setEditingEntryId(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedCategory) return;
    const trimmed = content.trim();
    if (!trimmed && selectedPhrases.length === 0) {
      toast.error("請輸入內容或選擇快速片語");
      return;
    }

    try {
      if (editingEntryId) {
        await updateEntry({
          entryId: editingEntryId as Id<"fieldJournalEntries">,
          type: selectedCategory,
          content: trimmed,
          quickPhrases: selectedPhrases.length > 0 ? selectedPhrases : undefined,
        });
        toast.success("日誌已更新");
      } else {
        await createEntry({
          fieldId,
          type: selectedCategory,
          content: trimmed,
          quickPhrases: selectedPhrases.length > 0 ? selectedPhrases : undefined,
        });
        toast.success("日誌已新增");
      }
      handleCancel();
    } catch {
      toast.error("儲存失敗，請重試");
    }
  }, [selectedCategory, content, selectedPhrases, editingEntryId, fieldId, createEntry, updateEntry, handleCancel]);

  const handleEdit = useCallback(
    (entry: NonNullable<typeof entries>[number]) => {
      setEditingEntryId(entry._id);
      setSelectedCategory(entry.type as JournalCategory);
      setContent(entry.content);
      setSelectedPhrases(entry.quickPhrases ?? []);
      setFormOpen(true);
      setTimeout(() => textareaRef.current?.focus(), 100);
    },
    [],
  );

  const handleDelete = useCallback(
    async (entryId: string) => {
      try {
        await deleteEntry({ entryId: entryId as Id<"fieldJournalEntries"> });
        toast.success("日誌已刪除");
      } catch {
        toast.error("刪除失敗");
      }
    },
    [deleteEntry],
  );

  const handleFilterToggle = useCallback((category: JournalCategory) => {
    setFilterCategory((prev) => (prev === category ? null : category));
  }, []);

  // --- Derived ---

  const filteredEntries = filterCategory && entries
    ? entries.filter((e) => e.type === filterCategory)
    : entries;

  const displayEntries = filteredEntries?.slice(0, SIDEBAR_ENTRY_LIMIT);
  const totalCount = entries?.length ?? 0;

  const quickPhrases = selectedCategory
    ? JOURNAL_QUICK_PHRASES[selectedCategory]
    : [];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-1.5">
        <BookOpen className="size-3.5 text-muted-foreground" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          田區日誌
        </h3>
        {fieldName && (
          <span className="truncate text-[10px] text-muted-foreground/70">
            — {fieldName}
          </span>
        )}
        {totalCount > 0 && (
          <Badge variant="secondary" className="ml-auto h-4 px-1.5 text-[10px]">
            {totalCount}
          </Badge>
        )}
      </div>

      {/* Category chips — quick add bar */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORIES.map((cat) => {
          const icon = JOURNAL_CATEGORY_ICONS[cat];
          const label = JOURNAL_CATEGORY_LABELS[cat];
          const isActive = formOpen && selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => handleCategoryTap(cat)}
              className={cn(
                "inline-flex min-h-[36px] items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all active:scale-95",
                isActive
                  ? CATEGORY_ACTIVE_COLORS[cat]
                  : CATEGORY_COLORS[cat],
                "hover:shadow-sm",
              )}
            >
              <span className="text-sm">{icon}</span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* Entry form */}
      {formOpen && selectedCategory && (
        <div className="space-y-2.5 rounded-lg border border-border/60 bg-muted/20 p-2.5">
          {/* Active category indicator */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                CATEGORY_ACTIVE_COLORS[selectedCategory],
              )}
            >
              <span>{JOURNAL_CATEGORY_ICONS[selectedCategory]}</span>
              {JOURNAL_CATEGORY_LABELS[selectedCategory]}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {editingEntryId ? "編輯中" : "新增記錄"}
            </span>
          </div>

          {/* Textarea */}
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="記錄觀察..."
            className="min-h-[60px] resize-none text-xs leading-relaxed"
            rows={3}
          />

          {/* Quick phrase chips */}
          {quickPhrases.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {quickPhrases.map((phrase) => {
                const isSelected = selectedPhrases.includes(phrase);
                return (
                  <button
                    key={phrase}
                    type="button"
                    onClick={() => handlePhraseTap(phrase)}
                    className={cn(
                      "min-h-[32px] rounded-md border px-2 py-1 text-[11px] transition-all active:scale-95",
                      isSelected
                        ? "border-primary/40 bg-primary/10 font-medium text-primary"
                        : "border-border/50 bg-background text-muted-foreground hover:bg-accent/30",
                    )}
                  >
                    {phrase}
                  </button>
                );
              })}
            </div>
          )}

          {/* Action row */}
          <div className="flex items-center gap-1.5">
            {/* Camera placeholder */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    disabled
                  >
                    <Camera className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">即將推出</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Voice placeholder */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    disabled
                  >
                    <Mic className="size-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">即將推出</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="flex-1" />

            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={handleCancel}
            >
              取消
            </Button>
            <Button
              size="sm"
              className="h-8 min-w-[52px] text-xs"
              onClick={handleSave}
              disabled={!content.trim() && selectedPhrases.length === 0}
            >
              {editingEntryId ? "更新" : "儲存"}
            </Button>
          </div>
        </div>
      )}

      {/* "New entry" button when form is closed */}
      {!formOpen && (
        <Button
          variant="outline"
          size="sm"
          className="w-full min-h-[36px] text-xs border-dashed"
          onClick={() => handleCategoryTap(JournalCategory.GENERAL)}
        >
          <Plus className="mr-1 size-3.5" />
          新增日誌
        </Button>
      )}

      {/* Filter chips (inline, compact) */}
      {totalCount > 0 && !formOpen && (
        <div className="flex flex-wrap gap-1">
          {CATEGORIES.map((cat) => {
            const count = entries?.filter((e) => e.type === cat).length ?? 0;
            if (count === 0) return null;
            const isActive = filterCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => handleFilterToggle(cat)}
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] transition-all",
                  isActive
                    ? "border-primary/40 bg-primary/10 text-primary font-medium"
                    : "border-transparent text-muted-foreground hover:bg-accent/30",
                )}
              >
                <span className="text-xs">{JOURNAL_CATEGORY_ICONS[cat]}</span>
                {count}
              </button>
            );
          })}
          {filterCategory && (
            <button
              type="button"
              onClick={() => setFilterCategory(null)}
              className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
            >
              <X className="size-2.5" />
              清除
            </button>
          )}
        </div>
      )}

      {/* Timeline — recent entries */}
      {displayEntries && displayEntries.length > 0 ? (
        <div className="space-y-1.5">
          {displayEntries.map((entry) => (
            <JournalEntryCard
              key={entry._id}
              entry={entry}
              onEdit={() => handleEdit(entry)}
              onDelete={() => handleDelete(entry._id)}
            />
          ))}
        </div>
      ) : (
        !formOpen && (
          <div className="flex flex-col items-center gap-1.5 py-4 text-center">
            <BookOpen className="size-6 text-muted-foreground/30" />
            <p className="text-[11px] text-muted-foreground">
              尚無日誌記錄，點擊上方分類開始記錄
            </p>
          </div>
        )
      )}

      {/* "View all" link */}
      {totalCount > SIDEBAR_ENTRY_LIMIT && (
        <button
          type="button"
          className="w-full text-center text-[11px] text-primary hover:underline"
          onClick={() => toast.info("完整日誌檢視即將推出")}
        >
          查看完整日誌（共 {totalCount} 筆）
        </button>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// JournalEntryCard
// ---------------------------------------------------------------------------

interface JournalEntryCardProps {
  entry: {
    _id: string;
    type: string;
    content: string;
    quickPhrases?: string[];
    createdAt: number;
    updatedAt?: number;
  };
  onEdit: () => void;
  onDelete: () => void;
}

const JournalEntryCard = React.memo(function JournalEntryCard({
  entry,
  onEdit,
  onDelete,
}: JournalEntryCardProps) {
  const category = entry.type as JournalCategory;
  const icon = JOURNAL_CATEGORY_ICONS[category] ?? "📋";
  const label = JOURNAL_CATEGORY_LABELS[category] ?? entry.type;

  return (
    <div
      className={cn(
        "group/entry rounded-lg border border-border/40 bg-background p-2 transition-colors hover:border-border/70",
      )}
    >
      {/* Top row: category + timestamp */}
      <div className="mb-1 flex items-center gap-1.5">
        <span className="text-xs">{icon}</span>
        <span
          className={cn(
            "rounded px-1 py-px text-[10px] font-medium",
            CATEGORY_COLORS[category],
          )}
        >
          {label}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {formatRelativeTime(entry.createdAt)}
        </span>
      </div>

      {/* Content */}
      <p className="line-clamp-3 text-xs leading-relaxed text-foreground/90">
        {entry.content}
      </p>

      {/* Quick phrase tags */}
      {entry.quickPhrases && entry.quickPhrases.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-0.5">
          {entry.quickPhrases.map((phrase) => (
            <span
              key={phrase}
              className="rounded bg-muted/50 px-1 py-px text-[9px] text-muted-foreground"
            >
              {phrase}
            </span>
          ))}
        </div>
      )}

      {/* Edit / Delete actions */}
      <div className="mt-1 flex justify-end gap-0.5 opacity-0 transition-opacity group-hover/entry:opacity-100">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onEdit}
          aria-label="編輯"
        >
          <Pencil className="size-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-destructive hover:text-destructive"
          onClick={onDelete}
          aria-label="刪除"
        >
          <Trash2 className="size-3" />
        </Button>
      </div>
    </div>
  );
});
