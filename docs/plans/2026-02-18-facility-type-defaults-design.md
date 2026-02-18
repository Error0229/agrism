# Facility Type Default Derivation Design

Date: 2026-02-18
Related issue: #62
Status: Implementation-ready

## Objective

降低 `其它類` 設施資料的手動補填成本，讓 `facilityType` 在建立或改派時自動帶入可用預設。

## Mapping Rule

- 設施作物名稱對應：
  - `蓄水池` -> `water_tank`
  - `馬達` -> `motor`
  - `道路` -> `road`
  - `工具間` -> `tool_shed`
  - `房舍` -> `house`
- 未命中映射時保持原行為（不強制填值）。

## Preservation Rule

- 若使用者已有合法 `facilityType`，不被自動推斷覆蓋。
- 僅在 `facilityType` 缺失或無效時套用推斷值。

## Integration Points

- `FieldToolbar`：
  - 新增作物時若為 `其它類`，自動帶入推斷 `facilityType`。
  - 更改作物改派到 `其它類` 時，若舊值無效/缺失，套用推斷值。
- `MapImportDialog`：
  - 套用匯入區域時，對設施作物寫入推斷 `facilityType`。
- `FieldsProvider` normalize：
  - 若 category 已知為 `其它類` 且 `facilityType` 無效，補推斷值（僅 normalization 階段）。

## Test Plan

- 單元測試：
  - 作物名稱對應推斷結果。
  - 已有合法值時不覆蓋。
  - 無映射名稱時回傳 undefined。
- 回歸：
  - 非 `其它類` 不注入設施欄位。

## Out of Scope

- 自動產生 `facilityName` 或命名序號。
