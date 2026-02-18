# Timeline Window Pruning Design

Date: 2026-02-18
Related issue: #72
Status: Implementation-ready

## Objective

在維持時間軸無限橫向捲動的前提下，避免日期陣列無限制成長。

## Strategy

- 設定日期數上限（例如 2,400 天）。
- 當超過上限時，保留 active date 附近固定窗口（例如前後各 900 天）。
- 修剪左側時補償 `scrollLeft`，保持使用者視覺位置穩定。

## Behavior

- 使用者仍可持續往任意方向捲動，系統在背景進行分段延伸與修剪。
- 不改變事件錨點與日期跳轉行為。

## Test Plan

- 純函式測試：
  - 超過上限時回傳修剪後 days 與移除數量。
  - active index 在窗口中心附近。
  - 不超上限時不修剪。

## Out of Scope

- 事件資料來源後端快取策略。
