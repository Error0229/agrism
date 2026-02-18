# Map Import Object URL Lifecycle Design

Date: 2026-02-18
Related issue: #70
Status: Implementation-ready

## Objective

避免 map import 圖片預覽使用 object URL 時的記憶體累積，建立一致的釋放與狀態復位機制。

## Lifecycle Rules

- 上傳新檔案前，若存在舊 object URL，先 `URL.revokeObjectURL`。
- Dialog 關閉時，釋放當前 object URL 並清空暫存狀態。
- 元件卸載時，釋放當前 object URL。

## State Reset Scope

- `previewUrl`
- `previewSize`
- `imageData`
- `zones`
- `calibrationPoints`
- `status`
- `processing`

## Implementation Notes

- 抽出 `safeRevokeObjectUrl(url)` helper，集中 null/empty 防護。
- 確保任何 early return/error path 都不遺漏 URL 釋放。

## Test Plan

- 單元測試：
  - `safeRevokeObjectUrl` 對空值不呼叫 revoke
  - 有效字串會呼叫 revoke 一次

## Out of Scope

- 圖片解碼效能優化。
