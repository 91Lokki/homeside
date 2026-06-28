# Homeside

[**English**](README.md) · [**繁體中文**](README.zh-TW.md)

Homeside 是一款非官方的 2026 世界盃伴侶 app，核心玩法是淘汰賽預測（Predict）和小型 Fantasy 選人遊戲。圍繞這兩個遊戲，提供主隊個人化體驗、即時賽程與比分、球隊頁面，以及選擇性的私人聯賽排行榜。

## 功能總覽

- **Predict**：從 32 強一路預測到決賽的每場淘汰賽勝隊。預測會自動往後傳遞，每場比賽在開球時鎖定，只有真實比賽結束後才計分。
- **Fantasy**：每輪組建 5 人陣容（GK、DEF、MID、FWD、FLEX）。支援隊長、轉會、國家名額限制、淘汰隊伍處理、球員照片及重點球員標記。
- **球隊（Team）**：瀏覽所有國家隊、查看主隊風格與吉祥獸、近況、下一場比賽、陣容、重點球員，以及根據真實賽事數據建立的能力雷達圖。
- **賽程（Schedule）**：小組積分榜、賽程表、即時比分、晉級狀態，以及已完賽比賽的詳細報告。
- **聯賽（League）**：整合 Supabase 的選擇性登入功能與 Predict／Fantasy 積分排行榜。
- **個人化**：選擇主隊、主隊配色 theme、亮色／暗色模式，以及中英文 UI 切換。

## 計分規則

### Predict

Predict 只計一件事：在比賽開球前，有沒有猜中這場淘汰賽的真實勝隊？

| 階段 | 答對得分 |
| --- | ---: |
| 32 強賽 | 1 |
| 16 強賽 | 2 |
| 八強賽 | 3 |
| 四強賽 | 5 |
| 季軍賽 | 1 |
| 決賽 | 8 |

完美預測的滿分是 63 分。不需要一次鎖定全部預測——每場比賽都可以在開球前隨時更改。開球後才填入的預測視為無效，不計分。

確認完整預測表（bracket）是選擇性的提前鎖定加成。如果在某場比賽開球前已確認完整預測表，該場答對可獲 1.4 倍加成。確認前已開球的比賽不適用加成。無比分預測、勝差加分、爆冷加分、連勝加分或額外冠軍加分。

### Fantasy

Fantasy 計分僅採用 ESPN feed 能穩定提供的數據：

| 事件 | 積分 |
| --- | ---: |
| 進球 | FWD +4、MID +5、DEF/GK +6 |
| 助攻 | +3 |
| Clean sheet（零封）| DEF/GK +4、MID +1 |
| GK 撲救 | 每 3 次 +1 |
| 場內 penalty 踢進 | 依位置同進球分 |
| 場內 penalty 踢失 | -2 |
| 點球大戰踢進 | +2 |
| 點球大戰踢失 | -1 |
| 黃牌 | -1 |
| 紅牌 | -3 |
| 烏龍球 | -2 |

不包含出場、上場時間、攔截、解圍、傳球、控球率、xG、xA 等統計的 Fantasy 積分。

## 資料來源

- 靜態賽事種子資料放在 `src/data/*`：球隊、賽程、bracket 結構、陣容、球隊統計、球員照片、旗幟、重點球員 metadata。
- 種子快照版本記錄在 `src/data/meta.ts`，目前驗證至 `2026-06-25`。
- 即時賽事資料透過本地 proxy routes 從 ESPN 公開 API 取得：
  - `GET /api/fixtures`
  - `GET /api/fixtures?date=YYYY-MM-DD`
  - `GET /api/match?fixture=ESPN_EVENT_ID`
- App 不會自行捏造未來比賽結果。若 ESPN 資料不可用，保持使用已 commit 的種子快照。
- Supabase 為選擇性整合，儲存原始使用者狀態：預測、Fantasy 陣容、主隊選擇、顯示名稱。積分在 client 端根據賽事資料重新計算。

## 技術架構（Stack）

- Vite
- React 18
- TypeScript
- Tailwind CSS
- React Router
- Supabase client（選擇性）
- Vercel Edge-style API handlers（在 `api/` 資料夾）
- Vitest（domain 邏輯測試）

## 本地開發

```bash
npm install
npm run dev
```

Vite dev server 同時提供 `api/` routes，不需要安裝 Vercel CLI。

常用指令：

```bash
npm run typecheck
npm run build
npm run test
npm run preview
```

選擇性的本地 Supabase 環境變數：

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

未設定時，登入功能與 League 頁面自動停用。本地狀態仍透過 `localStorage` 運作。

## 部署（Deploy）

此 app 以 Vercel 搭配 Vite 為目標。

1. Import repo。
2. 選擇 Vite framework preset。
3. 選擇性設定 `VITE_SUPABASE_URL` 與 `VITE_SUPABASE_ANON_KEY`。
4. Deploy。

`api/` 下的 API routes 會自動偵測，`vercel.json` 確保 SPA 的 client-side routing 正常運作。

## 專案結構

```text
api/                  ESPN proxy routes 與共用 proxy helper
docs/                 設定與設計說明文件
exports/              產出的匯出檔案
public/players/       已下載的球員照片
scripts/              種子資料、陣容、ESPN、球員照片相關工具腳本
supabase/             選擇性的聯賽 schema
src/
  components/         可重用 UI、球員頭像、旗幟、吉祥獸圖形
  data/               產出的靜態賽事資料
  domain/             純計分、bracket、積分榜、fantasy、ratings 邏輯
  lib/                API 正規化、i18n helpers、Supabase client、工具函式
  screens/            Predict、Fantasy、Team、Schedule、League、Home
  state/              app、auth、遊戲、語言、theme 狀態
```

## 核心檔案

- `src/domain/predict.ts` — bracket 預測計分與 predicted-bracket 傳遞邏輯
- `src/domain/bracket.ts` — 根據小組積分和已完賽淘汰賽結果解析真實 bracket
- `src/domain/fantasy.ts` — roster 位置、fantasy 計分、轉會與名額限制
- `src/domain/fantasyRounds.ts` — 輪次鎖定、當前輪次、即時 polling 視窗
- `src/state/store.tsx` — 主隊、配色、ESPN 結果 polling、種子資料合併
- `src/state/games.tsx` — 預測與 fantasy 狀態、本地持久化、Supabase sync、預測鎖定狀態
- `src/screens/Predict.tsx` — bracket 預測 UI
- `src/screens/Fantasy.tsx` — fantasy 陣容 UI 與輪次積分顯示
- `src/screens/Team.tsx` — 球隊瀏覽、重點球員、陣容、能力雷達圖
- `src/screens/Schedule.tsx` — 小組積分榜、賽程、即時比分、比賽報告
- `src/screens/Leaderboard.tsx` — 選擇性 Supabase 聯賽排行榜

## 種子資料（Generated Data）

種子檔案由 scripts 產生，應視為資料而非手動編輯，除非任務明確是修正快照內容。

常用 scripts：

```bash
node scripts/build-seed.mjs
node scripts/build-squads.mjs
node scripts/build-player-photos.mjs
node scripts/download-player-photos.mjs
node scripts/fetch-espn.mjs
```

## 聲明

Homeside 是非官方粉絲作品，與 FIFA、ESPN 或任何國家足球協會無關。
