import type { JournalCategory } from "@/lib/types/enums";

/**
 * Pre-built quick phrase chips per journal category.
 * Tapping a phrase appends it to the journal entry content.
 * All phrases are in Traditional Chinese (zh-TW).
 */
export const JOURNAL_QUICK_PHRASES: Record<JournalCategory, string[]> = {
  growth: [
    "葉片發黃",
    "新芽萌發",
    "開花了",
    "結果了",
    "生長緩慢",
    "長勢良好",
  ],
  pest: [
    "發現蚜蟲",
    "葉片有斑點",
    "蟲咬痕跡",
    "需要噴藥",
    "已施藥處理",
  ],
  soil: [
    "土壤偏乾",
    "排水不良",
    "已施肥",
    "已翻土",
    "pH值偏高",
    "已加石灰",
  ],
  harvest: [
    "已可採收",
    "品質良好",
    "產量不錯",
    "部分腐爛",
  ],
  weather: [
    "颱風損傷",
    "大雨過後",
    "連日乾旱",
    "霜害",
    "日照不足",
  ],
  general: [],
};
