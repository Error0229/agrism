# Utility Edge Kind Consistency Design

Date: 2026-02-18
Related issue: #64
Status: Implementation-ready

## Objective

確保 utility graph 的 `edge.kind` 與端點節點種類一致，避免水電語意混亂。

## Rules

- `water` edge 只能連接 `water` nodes。
- `electric` edge 只能連接 `electric` nodes。
- 若任一端節點不存在或種類不符，edge 在 normalize/replay 時移除。

## UI Behavior

- 連接節點面板中：
  - 起點/終點列表依 `edgeKind` 過濾。
  - 切換 `edgeKind` 時，若既有選擇不再合法，自動清空。
- 連線建立前再次檢查合法性，避免 race 狀態下產生髒資料。

## Data Compatibility

- 舊資料中不一致 edge 透過 `normalizeUtilityNetwork` 自動清理，不需破壞性 migration。

## Test Plan

- `field-context.test.ts`：
  - 混合 kind edge 會被過濾。
- `events.test.ts`（可選補充）：
  - replay 時不一致 edge 不會進入結果 state。

## Out of Scope

- 跨系統轉接器節點（例如水電混合節點）建模。
