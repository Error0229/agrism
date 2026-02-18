import { CropCategory } from "@/lib/types";

export type RotationSuggestion = { next: CropCategory[]; reason: string };

export const rotationSuggestions: Partial<Record<CropCategory, RotationSuggestion>> = {
  [CropCategory.葉菜類]: {
    next: [CropCategory.豆類, CropCategory.根莖類],
    reason: "葉菜類消耗大量氮肥，後作種豆類可固氮恢復地力，根莖類可利用不同土層養分。",
  },
  [CropCategory.瓜果類]: {
    next: [CropCategory.葉菜類, CropCategory.辛香料],
    reason: "瓜果類根系深，後作淺根葉菜可利用表土養分，辛香料有助驅蟲。",
  },
  [CropCategory.根莖類]: {
    next: [CropCategory.葉菜類, CropCategory.豆類],
    reason: "根莖類翻鬆深層土壤，後作葉菜或豆類可受益於改良的土壤結構。",
  },
  [CropCategory.茄果類]: {
    next: [CropCategory.豆類, CropCategory.葉菜類, CropCategory.辛香料],
    reason: "茄果類易有土傳病害，輪作豆類固氮，葉菜或辛香料可減少病害循環。",
  },
  [CropCategory.辛香料]: {
    next: [CropCategory.瓜果類, CropCategory.茄果類],
    reason: "辛香料有抑菌效果，後作瓜果類或茄果類可減少病蟲害。",
  },
  [CropCategory.水果類]: {
    next: [CropCategory.豆類, CropCategory.葉菜類],
    reason: "果樹間作豆類可固氮，葉菜類可作為覆蓋作物保護土壤。",
  },
  [CropCategory.豆類]: {
    next: [CropCategory.葉菜類, CropCategory.瓜果類, CropCategory.茄果類],
    reason: "豆類固氮後，後作需氮量高的葉菜或瓜果類可充分利用。",
  },
};

export const companionConflicts: Record<string, { avoid: string[]; alternatives: string[] }> = {
  tomato: {
    avoid: ["potato", "cabbage"],
    alternatives: ["basil", "green-onion"],
  },
  eggplant: {
    avoid: ["potato"],
    alternatives: ["green-onion", "ginger"],
  },
  cucumber: {
    avoid: ["potato", "watermelon"],
    alternatives: ["green-onion", "mustard-greens"],
  },
  cabbage: {
    avoid: ["tomato"],
    alternatives: ["green-onion", "ginger"],
  },
  pumpkin: {
    avoid: ["potato"],
    alternatives: ["mustard-greens", "green-onion"],
  },
  "bitter-gourd": {
    avoid: ["potato"],
    alternatives: ["mustard-greens", "ginger"],
  },
};
