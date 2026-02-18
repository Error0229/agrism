# Utility Overlay Node/Edge Management Design

Date: 2026-02-18
Related issue: #52
Status: Implementation-ready

## Objective

補足田園規劃水電圖層的維護能力，避免長期使用後留下無效連線，並讓使用者可以直接管理節點與邊線。

## Problem

- 目前支援新增節點與建立連線，但缺少刪除與清理流程。
- 當節點被改名、同步或版本轉換後，可能殘留指向不存在節點的孤兒 edge。
- 若未在 replay/normalize 層處理，舊資料可能持續污染新版本狀態。

## Scope

- Toolbar 新增「管理水電」入口。
- 支援刪除指定節點並同步移除關聯連線。
- 支援一鍵清除所有連線（保留節點）。
- 在 field normalize 與 event replay 階段都進行 utility network 正規化。

## Data Rules

- Utility node 必須具備：
  - `id` 非空字串
  - `label` 非空字串
  - `kind` 僅限 `water | electric`
  - `position.x/y` 為 finite number
- Utility edge 必須具備：
  - `id`, `fromNodeId`, `toNodeId` 非空字串
  - `fromNodeId !== toNodeId`
  - `kind` 僅限 `water | electric`
- Edge 最終需通過 node existence check；指向不存在節點即移除。

## UI Behavior

- `管理水電` Popover：
  - 選擇既有節點後可執行刪除。
  - 刪除前提示確認，避免誤刪。
  - 提供一鍵清除連線按鈕。
- 操作完成後即更新 field event stream，不直接改 local mutable state。

## Replay/Compatibility

- `normalizeField` 套用 `normalizeUtilityNetwork`，保證 legacy field 載入即清理孤兒 edge。
- `replayPlannerEvents`：
  - `field_created` 對 payload utility network 做正規化。
  - `field_updated` 對「新 payload + 現有 field」合併結果做正規化，避免節點更新後遺留舊 edge。

## Test Plan

- `field-context.test.ts`：
  - legacy field 轉換時會刪除 orphan edges。
  - utility normalize 會濾除無效 node/edge。
- `events.test.ts`：
  - replay 在節點更新刪除後，會清掉關聯與孤兒 edges。

## Out of Scope

- 自動路徑規劃、最短路徑、拓樸最佳化。
- 節點群組、圖層權限控制。
