# 花蓮蔬果種植指南（Agrism）

花蓮在地化農務管理 Web App，面向小型家庭菜園到進階農友。  
目前以繁體中文（zh-TW）為主介面，重點是「規劃決策 + 在地天氣 + 可回溯農務紀錄」。

## 產品重點

- 作物資料庫：內建作物、自訂作物、作物模板
- 田區規劃：2D 畫布、事件溯源時間軸、空間衝突檢查
- 任務規劃：自動任務生成、週任務優先排序、工時瓶頸預警
- 收成預估：區間式預估（最早/可能/最晚）與信心度
- 農場管理：收成、財務、土壤剖面、土壤改良、天氣與輪作建議
- 自動化建議：依天氣異常規則產生可確認的調整建議與重規劃觸發
- 外部整合：天氣、氣候/行情/感測器適配器（目前為 mock 路徑）
- AI 助手：OpenRouter + Vercel AI SDK

## 技術棧

- Next.js 16（App Router）
- React 19 + TypeScript 5（strict）
- Tailwind CSS v4 + shadcn/ui
- react-konva（田區畫布）
- Recharts（統計圖表）
- Vitest（單元測試）
- Auth.js + Neon（目前用於 auth/planner API 路徑）
- 前端狀態：React Context + localStorage

## 開發環境

## 需求

- Bun 1.3+
- Node.js 20+（供部分工具鏈）

## 安裝與啟動

```bash
bun install
bun run dev
```

預設網址：`http://localhost:3000`

## 常用指令

```bash
bun run dev
bun run build
bun run lint
bun test
bunx tsc --noEmit
```

## 環境變數

建立 `.env.local`（或 `.env`）並填入：

```bash
OPENROUTER_API_KEY=...
DATABASE_URL=...
NEXTAUTH_SECRET=...
```

說明：

- `OPENROUTER_API_KEY`：AI 助手與作物 AI 補全路徑需要
- `DATABASE_URL`：Neon Postgres（auth/planner server route）
- `NEXTAUTH_SECRET`：Auth.js session/JWT 穩定性需要

## 路由

- `/` 儀表板
- `/calendar` 行事曆與任務時間軸
- `/crops` 作物資料庫
- `/crops/[cropId]` 作物詳情
- `/field-planner` 田區視覺規劃
- `/farm-management` 收成/財務/土壤/天氣/輪作/資料匯入匯出
- `/ai-assistant` AI 農務助手
- `/auth/login` 登入頁

## API 路徑

- `/api/chat` 串流 AI 對話
- `/api/crop-info` 作物 AI 補全
- `/api/weather` 花蓮天氣 + 警示 + 信心度
- `/api/integration/overview` 外部資料整合總覽（氣候/行情/感測 mock）
- `/api/planner/*` 田區事件儲存與時間軸查詢
- `/api/auth/*` 登入註冊與 session

## 架構摘要

## 前端狀態層

- `src/lib/store/fields-context.tsx`：田區與事件流
- `src/lib/store/tasks-context.tsx`：任務與工時正規化
- `src/lib/store/custom-crops-context.tsx`：自訂作物與模板
- `src/lib/store/farm-management-context.tsx`：收成/財務/土壤/天氣等紀錄

## 領域邏輯層

- 作物 schema：`src/lib/data/crop-schema.ts`
- 任務排序與工時：`src/lib/utils/task-prioritizer.ts`、`src/lib/utils/workload-forecast.ts`
- 收成預估：`src/lib/utils/harvest-forecast.ts`
- 天氣警示/自動化規則：`src/lib/weather/severe-alerts.ts`、`src/lib/automation/rules.ts`
- 資料轉移：`src/lib/utils/farm-data-transfer.ts`

## 整合層

- 天氣 provider：`src/lib/weather/providers/*`
- 外部資料 adapter：`src/lib/integration/*`

## 測試策略（現況）

- 以 Vitest 為主的單元測試
- 覆蓋：schema/migration、規劃邏輯、天氣信心、自動化規則、資料轉移、整合適配器
- 目前尚未配置 E2E 測試框架

## 專案管理

- 工作規範：`AGENTS.md`
- 設計與里程碑文件：`docs/plans/`
- CI：`.github/workflows/ci.yml`

## 注意事項

- 本專案目前仍以 localStorage 為主要資料儲存（非完整後端資料庫系統）
- API 失敗時設計為可降級，不應阻斷核心在地規劃流程
