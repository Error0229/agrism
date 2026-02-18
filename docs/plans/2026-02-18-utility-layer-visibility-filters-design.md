# Utility Layer Visibility Filters Design

Date: 2026-02-18
Related issue: #66
Status: Implementation-ready

## Objective

降低水電圖層密度高時的視覺干擾，提供水/電子圖層獨立顯示控制。

## UI Model

- 保留原有總開關 `showUtilities`。
- 新增種類開關：
  - `showWaterUtilities`
  - `showElectricUtilities`
- 總開關關閉時，種類開關不生效（全部隱藏）。

## Rendering Rule

- 節點顯示條件：
  - `showUtilities && (node.kind === "water" ? showWaterUtilities : showElectricUtilities)`
- 連線顯示條件：
  - `showUtilities && (edge.kind === "water" ? showWaterUtilities : showElectricUtilities)`

## Data & State

- 僅 UI 層可視性狀態，不改動 `Field` 資料。
- 不影響 event replay 或 normalize。

## Test Plan

- 新增 utility filter helper 的單元測試：
  - 總開關關閉 -> 不顯示任何 node/edge
  - 僅 water 開啟 -> 顯示 water node/edge
  - 僅 electric 開啟 -> 顯示 electric node/edge

## Out of Scope

- 圖層透明度控制。
- 類別分組折疊面板。
