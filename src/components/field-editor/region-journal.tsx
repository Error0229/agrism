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
  useRegionJournal,
  useCreateRegionJournalEntry,
  useUpdateRegionJournalEntry,
  useDeleteRegionJournalEntry,
} from "@/hooks/use-journal";
import type { Id } from "../../../convex/_generated/dataModel";

const JOURNAL_CATEGORY_VALUES = new Set<string>(Object.values(JournalCategory));

function isJournalCategory(value: string): value is JournalCategory {
  return JOURNAL_CATEGORY_VALUES.has(value);
}

// ---------------------------------------------------------------------------
// Constants (shared with field journal)
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
// RegionJournal component
// ---------------------------------------------------------------------------

interface RegionJournalProps {
  plantedCropId: Id<"plantedCrops">;
  cropName?: string;
  cropEmoji?: string;
}

export const RegionJournal = React.memo(function RegionJournal({
  plantedCropId,
  cropName: _cropName,
  cropEmoji: _cropEmoji,
}: RegionJournalProps) {
  const entries = useRegionJournal(plantedCropId);
  const createEntry = useCreateRegionJournalEntry();
  const updateEntry = useUpdateRegionJournalEntry();
  const deleteEntry = useDeleteRegionJournalEntry();

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
          entryId: editingEntryId as Id<"regionJournalEntries">,
          type: selectedCategory,
          content: trimmed,
          quickPhrases: selectedPhrases.length > 0 ? selectedPhrases : undefined,
        });
        toast.success("筆記已更新");
      } else {
        await createEntry({
          plantedCropId,
          type: selectedCategory,
          content: trimmed,
          quickPhrases: selectedPhrases.length > 0 ? selectedPhrases : undefined,
        });
        toast.success("筆記已新增");
      }
      handleCancel();
    } catch {
      toast.error("儲存失敗，請重試");
    }
  }, [selectedCategory, content, selectedPhrases, editingEntryId, plantedCropId, createEntry, updateEntry, handleCancel]);

  const handleEdit = useCallback(
    (entry: NonNullable<typeof entries>[number]) => {
      setEditingEntryId(entry._id);
      setSelectedCategory(isJournalCategory(entry.type) ? entry.type : JournalCategory.GENERAL);
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
        await deleteEntry({ entryId: entryId as Id<"regionJournalEntries"> });
        toast.success("筆記已刪除");
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
    <div className="space-y-1.5">
      {/* Header + category chips + add button in one compact row */}
      <div className="flex items-center gap-1.5 pb-0.5">
        <div className="flex size-4 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
          <BookOpen className="size-2.5" />
        </div>
        <h3 className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-foreground/70">
          筆記
        </h3>
        {totalCount > 0 && (
          <Badge variant="secondary" className="h-3.5 px-1 text-[9px]">
            {totalCount}
          </Badge>
        )}

        {/* Compact emoji-only category chips */}
        <TooltipProvider delayDuration={300}>
          <div className="flex items-center gap-0.5">
            {CATEGORIES.map((cat) => {
              const icon = JOURNAL_CATEGORY_ICONS[cat];
              const label = JOURNAL_CATEGORY_LABELS[cat];
              const isActive = formOpen && selectedCategory === cat;
              return (
                <Tooltip key={cat}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => handleCategoryTap(cat)}
                      className={cn(
                        "inline-flex size-6 items-center justify-center rounded border text-xs transition-all active:scale-95",
                        isActive
                          ? CATEGORY_ACTIVE_COLORS[cat]
                          : CATEGORY_COLORS[cat],
                        "hover:shadow-sm",
                      )}
                    >
                      {icon}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {label}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </TooltipProvider>

        <div className="h-px flex-1 bg-border/60" />
      </div>

      {/* Entry form */}
      {formOpen && selectedCategory && (
        <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-2">
          {/* Active category */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold",
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
            className="min-h-[48px] resize-none text-xs leading-relaxed"
            rows={2}
          />

          {/* Quick phrases */}
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
                      "min-h-[28px] rounded-md border px-1.5 py-0.5 text-[10px] transition-all active:scale-95",
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

          {/* Actions */}
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground"
                    disabled
                  >
                    <Camera className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">即將推出</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground"
                    disabled
                  >
                    <Mic className="size-3" />
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
              className="h-7 text-xs"
              onClick={handleCancel}
            >
              取消
            </Button>
            <Button
              size="sm"
              className="h-7 min-w-[44px] text-xs"
              onClick={handleSave}
              disabled={!content.trim() && selectedPhrases.length === 0}
            >
              {editingEntryId ? "更新" : "儲存"}
            </Button>
          </div>
        </div>
      )}

      {/* "New entry" button — compact, only when no entries yet */}
      {!formOpen && totalCount === 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-full text-[10px] text-muted-foreground"
          onClick={() => handleCategoryTap(JournalCategory.GENERAL)}
        >
          <Plus className="mr-0.5 size-2.5" />
          點擊上方圖示新增筆記
        </Button>
      )}

      {/* Filter chips */}
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
            <RegionJournalEntryCard
              key={entry._id}
              entry={entry}
              onEdit={() => handleEdit(entry)}
              onDelete={() => handleDelete(entry._id)}
            />
          ))}
        </div>
      ) : (
        !formOpen && (
          <p className="py-1 text-center text-[9px] text-muted-foreground/60">
            點擊上方圖示開始記錄
          </p>
        )
      )}

      {/* View all link */}
      {totalCount > SIDEBAR_ENTRY_LIMIT && (
        <button
          type="button"
          className="w-full text-center text-[10px] text-primary hover:underline"
          onClick={() => toast.info("完整日誌檢視即將推出")}
        >
          查看全部（共 {totalCount} 筆）
        </button>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// RegionJournalEntryCard
// ---------------------------------------------------------------------------

interface RegionJournalEntryCardProps {
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

const RegionJournalEntryCard = React.memo(function RegionJournalEntryCard({
  entry,
  onEdit,
  onDelete,
}: RegionJournalEntryCardProps) {
  const category = isJournalCategory(entry.type) ? entry.type : JournalCategory.GENERAL;
  const icon = JOURNAL_CATEGORY_ICONS[category] ?? "📋";
  const label = JOURNAL_CATEGORY_LABELS[category] ?? entry.type;

  return (
    <div className="group/entry rounded-md border border-border/40 bg-background p-1.5 transition-colors hover:border-border/70">
      {/* Top row */}
      <div className="mb-0.5 flex items-center gap-1">
        <span className="text-[11px]">{icon}</span>
        <span
          className={cn(
            "rounded px-1 py-px text-[9px] font-medium",
            CATEGORY_COLORS[category],
          )}
        >
          {label}
        </span>
        <span className="ml-auto text-[9px] text-muted-foreground">
          {formatRelativeTime(entry.createdAt)}
        </span>
      </div>

      {/* Content */}
      <p className="line-clamp-2 text-[11px] leading-relaxed text-foreground/90">
        {entry.content}
      </p>

      {/* Quick phrase tags */}
      {entry.quickPhrases && entry.quickPhrases.length > 0 && (
        <div className="mt-0.5 flex flex-wrap gap-0.5">
          {entry.quickPhrases.map((phrase) => (
            <span
              key={phrase}
              className="rounded bg-muted/50 px-1 py-px text-[8px] text-muted-foreground"
            >
              {phrase}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-0.5 flex justify-end gap-0.5 opacity-0 transition-opacity group-hover/entry:opacity-100">
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
