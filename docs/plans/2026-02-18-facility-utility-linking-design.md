# Facility-Utility Linking Design

Date: 2026-02-18
Related issue: #56
Status: Implementation-ready

## Objective

讓 `其它類` 設施區域可關聯到水/電節點，補齊「設施位置」與「管線節點」之間的語意連結。

## Problem

- 目前設施與 utility overlay 互相獨立。
- 維運時無法快速辨識某區域對應哪些節點。

## Data Model

- 擴充 `PlantedCrop`：
  - `linkedUtilityNodeIds?: string[]`

## Normalization Rules

- 只有 `其它類` 區域保留 `linkedUtilityNodeIds`。
- 清理規則：
  - 非字串或空字串 ID 移除。
  - 重複 ID 去重。
  - 不存在於該 field `utilityNodes` 的 ID 移除。
- 非 `其它類` 區域一律移除該欄位。

## UI Changes

- `FieldToolbar` 在「設施設定」中新增節點多選清單：
  - 點擊可切換關聯/取消關聯。
  - 僅顯示現有 utility nodes。
- 無 utility nodes 時顯示提示文字。

## Rendering Changes

- `FieldCanvas` 設施名稱下方顯示連結摘要：
  - `已連結 N 節點`（N > 0 時）。

## Compatibility

- 舊資料未含欄位時視為空陣列語意。
- 若節點被刪除，關聯在正規化時自動清理孤兒 ID。

## Test Plan

- 單元測試：
  - 關聯 ID 去重與無效值移除。
  - 非 `其它類` 區域移除關聯欄位。
  - 顯示摘要文案生成測試。
- 回歸測試：
  - 無關聯時既有作物顯示不變。

## Out of Scope

- 設施到節點的路徑可視化高亮。
- 巡檢排程或故障告警流程。
