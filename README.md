# 花蓮蔬果種植指南（Agrism）

花蓮在地化農務管理 Web App，面向小型家庭菜園到進階農友。
繁體中文（zh-TW）為主介面，核心圍繞「智慧規劃 + 在地天氣 + 可回溯農務紀錄 + AI 農業顧問」。

## 產品重點

- **作物資料庫**：60+ 欄位的作物知識 Schema v3，AI 七階段自動補全，證據式作物匯入（4-pass AI 研究 + 審核流程）
- **田區規劃**：2D 互動畫布（react-konva）、田區列表、設施與管線網路
- **季節規劃**：田區優先季節規劃板（Field-First Season Planner）、佔用與接茬規劃、重疊偵測
- **作物生命週期**：成長階段追蹤、模糊種植日期支援、作物詳情頁（專業佈局 + 行內編輯）
- **任務系統**：規則式每日任務生成（7 條確定性規則）、行事曆時間軸
- **農場紀錄**：收成日誌、財務報表、土壤剖面／改良／筆記、天氣觀測
- **適地適種引擎**：作物-田區適配性檢查（5 項約束條件）
- **AI 每日簡報**：推薦引擎 + 回饋迴路（確認／延後／駁回 + 學習機制）
- **天氣重規劃**：7 日預報觸發調整建議
- **灌溉顧問**：灌溉區域管理 + AI 澆水建議
- **病蟲害分診**：症狀觀察記錄 + AI 診斷分析
- **農場地理設定**：台灣縣市鄉鎮選擇器、地理感知農藝設定檔（Geography-Keyed Hierarchy）
- **AI 助手**：OpenRouter + Vercel AI SDK，花蓮在地化系統提示（颱風季、亞熱帶氣候、有機實務）

## 技術棧

| 類別 | 技術 |
| --- | --- |
| 框架 | Next.js 16（App Router）、React 19、TypeScript 5（strict） |
| 資料庫 | [Convex](https://convex.dev)（即時資料庫，21 張表，定義於 `convex/schema.ts`） |
| 認證 | [Clerk](https://clerk.com)（`@clerk/nextjs`）+ Convex 整合 |
| 伺服端狀態 | Convex `useQuery` / `useMutation`（即時響應） |
| UI 狀態 | Zustand（田區編輯器：工具、縮放、選取、復原/重做） |
| 樣式 | Tailwind CSS v4 + shadcn/ui（New York 風格） |
| 畫布 | react-konva |
| 表單 | react-hook-form + zod 驗證 |
| 圖表 | Recharts |
| 圖示 | lucide-react |
| 拖放 | @dnd-kit |
| Markdown | react-markdown + @tailwindcss/typography |
| AI | @openrouter/ai-sdk-provider + Vercel AI SDK |
| 單元測試 | Vitest |
| E2E 測試 | Playwright |

## 路由

已認證路由使用 `(app)` route group，透過 Clerk middleware 保護。

| 路由 | 說明 |
| --- | --- |
| `/` | 儀表板（統計、今日任務、天氣） |
| `/calendar` | 種植行事曆與任務管理 |
| `/crops` | 作物資料庫瀏覽 |
| `/crops/[cropId]` | 作物詳情（專業佈局 + 行內編輯 + 範圍標記 + 來源檢視） |
| `/fields` | 田區列表與新增 |
| `/fields/[fieldId]` | 互動式田區編輯器畫布 |
| `/records/harvest` | 收成日誌管理 |
| `/records/finance` | 財務紀錄（收入/支出） |
| `/records/soil` | 土壤剖面、改良紀錄、筆記 |
| `/records/pest` | 病蟲害觀察紀錄 |
| `/weather` | 天氣資料與手動觀測記錄 |
| `/ai` | AI 農務助手對話介面 |
| `/settings` | 帳號設定、農場地理位置、資料匯出/匯入 |

### API 路徑

| 路徑 | 說明 |
| --- | --- |
| `/api/chat` | 串流 AI 對話（OpenRouter） |
| `/api/weather` | 花蓮天氣資料 |

## 資料庫 Schema

使用 Convex 即時資料庫，共 21 張表，定義於 `convex/schema.ts`：

- **認證**：`farms`、`farmMembers`
- **作物**：`crops`（60+ 欄位）、`cropTemplates`、`cropTemplateItems`
- **田區**：`fields`（含內嵌 fieldContexts + soilProfiles）、`plantedCrops`（含生命週期）、`facilities`、`utilityNodes`、`utilityEdges`
- **任務**：`tasks`
- **紀錄**：`harvestLogs`、`financeRecords`、`soilAmendments`、`soilNotes`、`weatherLogs`
- **規劃**：`plannedPlantings`
- **灌溉**：`irrigationZones`
- **病蟲害**：`pestObservations`
- **AI 建議**：`recommendations`

## Convex 後端模組

後端函數位於 `convex/` 目錄，包含：

`farms` · `fields` · `crops` · `cropEnrichment` · `cropImport` · `tasks` · `dailyTaskGeneration` · `harvest` · `finance` · `soil` · `weather` · `weatherReplan` · `plannedPlantings` · `suitability` · `irrigationZones` · `irrigationAdvice` · `pestObservations` · `pestTriage` · `recommendations` · `briefingContext` · `briefingGeneration` · `dataTransfer`

## 開發環境

### 需求

- Bun 1.3+
- Node.js 20+（部分工具鏈需要）
- Convex CLI（`bun add -g convex`）

### 安裝與啟動

```bash
bun install
```

啟動開發伺服器與 Convex 後端（需分別在兩個終端執行）：

```bash
bun run dev       # Next.js 開發伺服器（預設 http://localhost:3000）
bun run convex    # Convex 開發伺服器
```

### 常用指令

```bash
bun run dev          # Next.js 開發伺服器（Turbopack）
bun run build        # 正式環境建置
bun run lint         # ESLint 檢查
bun run test         # Vitest 單元測試
bun run test:e2e     # Playwright E2E 測試（使用 port 3099）
bun run convex       # Convex 開發伺服器
```

## 環境變數

建立 `.env.local` 並填入：

```bash
# Convex
CONVEX_DEPLOYMENT=...
NEXT_PUBLIC_CONVEX_URL=...

# Clerk 認證
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

# AI 功能
OPENROUTER_API_KEY=...
```

| 變數 | 說明 |
| --- | --- |
| `CONVEX_DEPLOYMENT` | Convex 部署識別碼 |
| `NEXT_PUBLIC_CONVEX_URL` | Convex 部署 URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk 公開金鑰 |
| `CLERK_SECRET_KEY` | Clerk 私密金鑰 |
| `OPENROUTER_API_KEY` | OpenRouter API 金鑰（AI 助手、作物補全、每日簡報等） |

## 架構概覽

### 狀態管理

- **伺服端狀態**：Convex `useQuery` / `useMutation`，即時響應，自動同步
- **UI 狀態**：Zustand store（`src/lib/store/field-editor-store.ts`）— 田區編輯器工具、縮放、平移、網格、選取、復原/重做
- **認證 context**：`useFarmId()` 透過 Convex 查詢解析農場

### 關鍵 Hooks

`useFarmId` · `useFields` · `useCrops` · `useTasks` · `useHarvestLogs` · `useFinanceRecords` · `useSoilProfile` · `useWeatherLogs`

### 型別系統

- `src/lib/types/domain.ts` — 核心領域型別（Crop、Field、Task 等）
- `src/lib/types/enums.ts` — 所有列舉（CropCategory、TaskType、PlotType 等）
- `src/lib/types/labels.ts` — 列舉的 zh-TW 標籤對應

### 關鍵設計模式

- 頁面預設為 Server Component，互動元件使用 `"use client"` 指令
- 田區編輯器使用 Command Pattern 實作復原/重做
- `cn()` 工具函數合併 clsx + tailwind-merge
- Middleware 使用 Clerk `clerkMiddleware` 保護路由
- Convex mutations 使用 validators 進行輸入驗證
- 路徑別名：`@/*` → `./src/*`

## 測試

- **單元測試**：Vitest — 8 個測試檔案，涵蓋生命週期檢查、農場地理設定、台灣地理資料、整合正規化/服務、規劃網格、天氣信心度
- **E2E 測試**：Playwright — 6 個測試檔案，涵蓋認證流程、田區編輯器、表單互動、導航、側邊欄

## 專案管理

- 開發規範：`CLAUDE.md`
- CI：`.github/workflows/ci.yml`
