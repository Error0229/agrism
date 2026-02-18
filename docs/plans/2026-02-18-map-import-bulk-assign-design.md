# Map Import Bulk Assign & Facility Suggestion Design

Date: 2026-02-18
Related issue: #60
Status: Implementation-ready

## Objective

縮短地圖分區匯入時的手動設定時間，透過批次指派與顏色推測設施，讓初始規劃更快完成。

## Problem

- 目前只能逐區選擇作物/設施，區域多時操作成本高。
- 缺少顏色到設施的快速建議（例如藍色區塊可能是水池、灰色區塊可能是道路）。

## Scope

- 新增批次套用 controls：
  - 選擇一個作物/設施
  - 一鍵套用到全部候選區域
- 新增「依顏色自動標示設施」：
  - 藍色優先映射蓄水池
  - 低飽和灰色優先映射道路
  - 暗紅棕色可映射房舍（若存在）
- 若對應設施作物不存在，保持原本選擇不覆寫。

## Heuristic Rules

- 以 hex 顏色轉 RGB 計算：
  - `blueDominant`: `b` 明顯高於 `r/g` -> `蓄水池`
  - `grayRoad`: 低飽和 + 中低亮度 -> `道路`
  - `houseTone`: 暗紅棕色 -> `房舍`
- 規則結果為「建議設施名稱」，再映射到 `allCrops` 中 `category=其它類` 的同名作物。

## UI Behavior

- 偵測結果列表上方新增批次列：
  - `Select` 批次作物
  - `套用到全部區域` 按鈕
  - `依顏色自動標示設施` 按鈕
- 使用者仍可逐區手動改寫（最後值優先）。

## Test Plan

- `map-zone-detection` 單元測試新增：
  - 顏色推測函式回傳預期設施名稱。
  - 自動套用只覆寫可映射的候選區域。
  - 批次套用覆蓋全部區域。

## Out of Scope

- AI 視覺辨識藍圖符號。
- 多圖層或地形高程判斷。
