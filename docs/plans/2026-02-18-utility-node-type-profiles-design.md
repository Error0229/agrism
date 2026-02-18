# Utility Node Type Profiles Design

Date: 2026-02-18
Related issue: #58
Status: Implementation-ready

## Objective

在既有 `water/electric` 基礎上補上節點子類型語意，提升水電圖層可讀性與維護效率。

## Data Model

- `UtilityNode` 新增：
  - `nodeType?: UtilityNodeType`
- `UtilityNodeType`：
  - `pump`
  - `tank`
  - `valve`
  - `outlet`
  - `junction`
  - `custom`

## Rule Set

- `kind` 與 `nodeType` 合法組合：
  - `water`: `pump | tank | valve | junction | custom`
  - `electric`: `outlet | junction | custom`
- 非法組合 fallback：
  - `water -> junction`
  - `electric -> outlet`

## UI Changes

- 新增節點時可選擇 nodeType。
- 管理水電面板新增節點編輯：
  - 選取節點
  - 調整 nodeType
  - 調整 label

## Rendering

- 節點顏色仍以 `kind` 決定。
- 文字顯示為：
  - `nodeType 中文名`
  - 若有自訂 label，顯示 `nodeType中文 - label`。

## Compatibility

- 舊資料沒有 `nodeType` 時，以 `kind` 對應預設值補齊。

## Test Plan

- nodeType 正規化（合法/非法組合）。
- fallback 規則測試。
- 顯示標籤組裝測試。

## Out of Scope

- 水電負載模擬。
- 自動偵測節點功能。
