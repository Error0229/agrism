# Timeline Keyboard Navigation Design

Date: 2026-02-18
Related issue: #74
Status: Implementation-ready

## Objective

提升時間軸無滑鼠操作效率，支援聚焦後的鍵盤快捷導航。

## Shortcut Map

- `ArrowLeft`: `-1 day`
- `ArrowRight`: `+1 day`
- `Shift + ArrowLeft`: `-7 days`
- `Shift + ArrowRight`: `+7 days`
- `PageUp`: `-1 month`
- `PageDown`: `+1 month`
- `Home`: reset timeline to today (`onReset`)

## Focus & Scope

- 時間軸主容器 `tabIndex=0`，可被鍵盤聚焦。
- 僅在容器本身接收 keydown 時生效。
- 若事件來源是 `input`/`textarea`/`select`，不攔截快捷鍵。

## Implementation

- 抽出 key-to-action helper，回傳 `deltaDays | deltaMonths | reset`。
- `TimelineSlider` 使用 helper 分派到既有 `moveByDays` / `moveByMonths` / `onReset`。

## Test Plan

- helper 單元測試：
  - Arrow/Page/Home 對應正確
  - Shift 修飾鍵分支正確
  - 不支援按鍵回傳 null

## Out of Scope

- 跨頁全域快捷鍵註冊。
