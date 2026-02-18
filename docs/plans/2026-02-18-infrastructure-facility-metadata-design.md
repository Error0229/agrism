# Infrastructure Facility Metadata Design

Date: 2026-02-18
Related issue: #54
Status: Implementation-ready

## Objective

讓 `其它類` 區域可直接記錄設施屬性（例如道路、蓄水池、馬達、工具間、房舍），提升地圖標示清楚度與資料可用性。

## Problem

- 現在雖可用 `其它類` 作物代表設施，但缺少結構化欄位。
- 設施名稱目前只能依作物名稱推測，無法同類型多區域客製命名。
- 沒有正規化規則可防止一般植栽誤帶設施欄位。

## Data Model

- 新增 `FacilityType`：
  - `water_tank`
  - `motor`
  - `road`
  - `tool_shed`
  - `house`
  - `custom`
- 擴充 `PlantedCrop`：
  - `facilityType?: FacilityType`
  - `facilityName?: string`

## Validation Rules

- 若區域對應作物類別不是 `其它類`：
  - 正規化時移除 `facilityType/facilityName`。
- 若是 `其它類`：
  - `facilityType` 必須為合法 enum，否則清空。
  - `facilityName` 需 trim；空字串視為未設定。
- 顯示標籤優先序：
  - `facilityName`
  - `facilityType` 對應中文名稱
  - 原作物名稱

## UI Changes

- `FieldToolbar` 在選取 `其它類` 區域時顯示設施設定區塊：
  - 設施類型下拉選單
  - 設施名稱輸入框
  - 變更即更新（型別即時更新、名稱於 blur 時更新）
- 對非 `其它類` 區域隱藏此區塊。

## Rendering Changes

- `FieldCanvas` 文字標示改為：
  - 若為設施區域，顯示 `facility label`（含客製名稱）。
  - 非設施維持現行作物名稱。

## Compatibility

- 舊資料不含新欄位，預設視為 undefined。
- 事件 replay 對 `crop_planted/crop_updated` 結果在顯示層採正規化，避免歷史髒資料影響新 UI。

## Test Plan

- 單元測試：
  - 設施欄位正規化（合法/非法/空字串）。
  - 非 `其它類` 自動清除設施欄位。
  - 顯示標籤 helper 優先序測試。
- 回歸測試：
  - 一般作物區域顯示與功能不變。

## Out of Scope

- 設施與水電節點自動連結。
- 新增設施 icon library 或 3D 視圖。
