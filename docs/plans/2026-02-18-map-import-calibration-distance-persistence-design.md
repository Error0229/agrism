# Map Import Calibration Distance Persistence Design

Date: 2026-02-18
Related issue: #78
Status: Implementation-ready

## Objective

保留 map import 兩點校正距離偏好，降低重複輸入成本。

## Storage

- key: `hualien-map-import-calibration-distance`
- value: number string（公尺）

## Normalization

- 允許正數且大於 0。
- 非法值回退 `"5"`。

## Integration

- `MapImportDialog` 以 `useLocalStorage` 管理距離值。
- 距離輸入欄綁定持久化狀態。
- 清除校正點僅清除點位，不清除距離偏好。

## Test Plan

- 單元測試：
  - 合法數值字串保留
  - 非法字串與負值回退預設

## Out of Scope

- 單位換算與公英制切換。
