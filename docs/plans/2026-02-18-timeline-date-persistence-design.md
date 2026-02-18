# Timeline Date Persistence Design

Date: 2026-02-18
Related issue: #76
Status: Implementation-ready

## Objective

保留時間軸使用者當前檢視日期，避免重新整理後失去歷史追溯上下文。

## Storage

- key: `hualien-planner-timeline-date`
- value: `YYYY-MM-DD` 或空字串

## Normalization

- 僅接受 `YYYY-MM-DD` 格式。
- 非法值回退 `""`（表示「現在」模式）。

## Behavior

- 日期切換時即更新儲存值。
- 點擊「回到現在」時清空儲存值。

## Test Plan

- 單元測試：
  - 合法日期保留
  - 非法型別/格式回退空字串

## Out of Scope

- URL query 共享與深連結。
