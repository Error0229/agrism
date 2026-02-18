# Utility Visibility Persistence Design

Date: 2026-02-18
Related issue: #68
Status: Implementation-ready

## Objective

讓水電圖層顯示偏好（總開關/水/電）在重新整理後保留，減少重複設定成本。

## Data Model

- localStorage key: `hualien-utility-visibility`
- shape:
  - `showUtilities: boolean`
  - `showWaterUtilities: boolean`
  - `showElectricUtilities: boolean`

## Normalization

- 非物件或欄位非 boolean 時回退預設值：
  - `showUtilities: true`
  - `showWaterUtilities: true`
  - `showElectricUtilities: true`

## Integration

- `FieldPlannerPage` 以 `useLocalStorage` 取代單純 `useState`。
- toggles 只更新 visibility 設定，不動任何 field 資料。

## Test Plan

- 新增設定正規化測試：
  - 空值/錯誤型別回退
  - 合法布林值保留

## Out of Scope

- 設定雲端同步與帳號層偏好設定。
