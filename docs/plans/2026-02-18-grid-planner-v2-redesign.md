# Grid Planner V2 Redesign Design Doc

Date: 2026-02-18
Issue: #80
Status: Draft for implementation

## 1. 背景與痛點

目前田地規劃器存在三個核心問題：

1. 語意錯置
- 「新增作物」清單同時包含房舍、道路、蓄水池等設施。
- 使用者認知上會把非植栽項目誤解為作物資料。

2. 互動流程僵硬
- 新增區域採固定欄位排列（5 欄 + 固定間距），不反映實際田區空間與已占用區。
- 格線密度固定，無法依場景切換粗細與吸附需求。

3. 前端維護成本高
- 畫布互動邏輯與 Konva 事件高度耦合，難以在 renderer 或框架變動時重用。
- 大量幾何邏輯散在元件內部，單元測試不足。

## 2. 目標

- 以農民工作流重設入口：先區分「植栽規劃」與「設施規劃」。
- 建立可配置的格線與吸附策略。
- 將關鍵幾何運算抽為純函式，降低 UI library 綁定。
- 保持與現有 planner events、timeline replay、map import 向後相容。
- 提供 WebGL renderer 遷移路徑（不在本次一次到位替換）。

## 3. Farmer Workflow V2

### 3.1 新增流程

1. 使用者選擇入口：
- `新增植栽區`
- `新增設施區`

2. 系統以項目尺寸 + 田區占用狀態進行自動落位。

3. 使用者進一步進行：
- 拖曳調整位置
- 區域切分/合併
- 更改植栽或設施屬性

### 3.2 格線流程

- 可設定格線密度：`0.5m`、`1m`、`2m`
- 可切換顯示/隱藏格線
- Snap 行為跟隨格線密度，不再硬編碼 0.5m

## 4. 資訊架構調整

## 4.1 工具列分流

`FieldToolbar` 由單一 `新增作物` 入口拆為：
- 植栽入口：只顯示非 `其它類` 類別
- 設施入口：只顯示 `其它類` 類別

雖然底層仍沿用 `PlantedCrop` 事件模型，但 UI 明確分流，避免「房舍=作物」的錯誤心智模型。

## 4.2 設施語意

- 設施入口文案使用「設施」而非「作物」。
- 保留既有 `facilityType/facilityName` 欄位。

## 5. 幾何與狀態架構

## 5.1 Grid 設定模型

新增純資料模型（localStorage persist）：
- `showGrid: boolean`
- `gridSizeMeters: 0.5 | 1 | 2`
- `snapToGrid: boolean`

預設值：`showGrid=true`, `gridSizeMeters=1`, `snapToGrid=true`。

## 5.2 Auto Placement

建立 `planner-placement` 純函式模組：
- 輸入：field 尺寸、已占用區、新項目尺寸、掃描步距
- 輸出：下一個可用座標

策略：
- 以左上到右下掃描候選點
- 避免與既有 growing 區域重疊
- 若無完整空位，回傳 fallback（邊界安全位置）

## 5.3 Grid 計算

建立 `planner-grid` 純函式模組：
- 依 field 尺寸與 `gridSizeMeters` 產生線段/標籤座標
- 與 renderer 解耦（回傳資料，不回傳 Konva 元件）

## 6. Renderer 解耦與 WebGL Path

## 6.1 本次實作

- `FieldCanvas` 僅負責把純函式輸出映射為 Konva primitive。
- 幾何計算不依賴 Konva event/object 型別。

## 6.2 遷移路徑（後續）

Phase A（本次）
- 抽離計算邏輯與互動設定，確保可測。

Phase B
- 引入 renderer adapter：
  - `toKonvaPrimitives(gridModel)`
  - `toWebGLDrawCalls(gridModel)`

Phase C
- 以 Pixi/WebGL 實作 grid + static layers。
- 保留編輯控制層（drag/resize semantics）不變。

## 7. 相容性

- 不修改 planner events schema。
- 不改動 `PlantedCrop` 儲存格式。
- timeline replay、map import 直接沿用。

## 8. 驗收與測試

### 8.1 單元測試

- `planner-placement.test.ts`
  - 空畫布落位
  - 避讓占用區
  - 無空位 fallback

- `planner-grid.test.ts`
  - 0.5/1/2m 線段數量與座標
  - 標籤間距

- `field-toolbar` 相關純函式測試
  - 植栽清單不含 `其它類`
  - 設施清單只含 `其它類`

### 8.2 回歸檢查

- `bun run lint`
- `bunx tsc --noEmit`
- `bun test`

## 9. 風險

- UI 分流但底層仍是 `PlantedCrop`，語意仍為過渡方案。
- WebGL 仍需後續 phase 才能完整替換 renderer。

## 10. 交付結果

本次交付的價值在於：
- 使用流程可理解度提升（植栽/設施分流）。
- 空間放置更貼近田區實況（occupancy-aware）。
- Grid 與幾何邏輯可測且可遷移，為 WebGL 重構鋪路。