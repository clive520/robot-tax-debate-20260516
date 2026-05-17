# AI 辯論所資料遷移計劃

本文件規劃如何將目前以靜態 HTML、Markdown、JSON、音檔與影片檔組成的 AI 辯論所，逐步遷移為 Supabase 資料庫驅動的網站。

## 遷移原則

1. 不一次推倒重做，採取並行遷移。
2. 先把資料搬進 Supabase，再改前台讀取來源。
3. 每一階段都要保留可回復狀態。
4. 已發布文章不得因遷移而無法閱讀。
5. 每次資料結構或流程變更都要記錄到 `docs/work-log.md`。

## 現況盤點

目前主要資料來源：

| 類型 | 位置 | 說明 |
| --- | --- | --- |
| 首頁列表 | `debates.json`、`portal.js` | 入口首頁文章列表 |
| 辯論頁 | `debates/*/index.html` | 每篇辯論各自一個 HTML |
| 辯論互動 | `engagement.js`、Supabase 現有表 | 登入、留言、按讚、點閱 |
| 逐字內容 | `debates/*/debate.md`、`app.js` | Markdown 與頁面程式 |
| 影音資料 | 各篇 HTML、publishing notes | YouTube、Spotify、MP3、SRT |
| 流程文件 | `docs/*.md` | 工作流程、上架流程、發布流程 |

目前已知辯論：

1. `school-phone`：學校是否應全面禁止學生帶手機到學校。
2. `euthanasia`：我國應將「積極安樂死」合法化。
3. `robot-tax`：我國應開徵「機器人稅」以因應 AI 造成的失業問題。
4. `death-penalty`：我國應廢除死刑。

## 目標狀態

完成遷移後：

1. 首頁從 Supabase `debates` 讀取已發布辯論。
2. 辯論頁用單一模板依 `slug` 動態載入內容。
3. 辯論逐字稿來自 `debate_segments`。
4. 裁判分數來自 `debate_scorecards`。
5. YouTube、Spotify、MP3、字幕、封面來自 `debate_media`。
6. 發布時間由 `debates.publish_at` 控制。
7. 後台可以新增、編輯、排程、貼影音網址。
8. 舊的 Markdown 與產製檔案仍保留作備份。

## 遷移階段

### 第一階段：資料庫準備

目的：建立新資料結構，但不影響現有網站。

工作項目：

1. 根據 `docs/database-plan.md` 撰寫新版 schema。
2. 新增新資料表與 RLS policy。
3. 保留目前既有 `profiles`、`debate_likes`、`debate_comments`、`debate_daily_views`、`debate_segment_likes`。
4. 若欄位型別需要從 `text` 遷移到 `uuid`，先採雙欄或轉接表，不直接破壞既有功能。

驗收：

1. SQL 可重複執行。
2. 不影響現有登入、留言、按讚、點閱。
3. 新表可以由管理者寫入，由一般讀者讀取已發布資料。

### 第二階段：建立資料匯入工具

目的：把目前四篇辯論從靜態檔案整理成可匯入資料。

工作項目：

1. 撰寫資料盤點腳本，讀取 `debates.json` 與各篇資料夾。
2. 建立中繼 JSON，例如 `migration/debates.seed.json`。
3. 將每篇辯論拆成：
   - `debates`
   - `debate_segments`
   - `debate_scorecards`
   - `debate_media`
4. 手動補齊無法可靠解析的資料，例如裁判評語、影音網址、發布時間。

驗收：

1. 四篇辯論都能轉成結構化 JSON。
2. 每一篇至少包含標題、摘要、發布狀態、正方、反方、裁判、段落、影音資料。
3. JSON 可人工檢查與版本控管。

### 第三階段：匯入 Supabase

目的：將整理好的資料寫入 Supabase。

工作項目：

1. 撰寫匯入 SQL 或 Node 腳本。
2. 先在 Supabase 測試資料表執行。
3. 確認 slug 不重複。
4. 匯入四篇既有辯論。
5. 建立媒體資料：
   - YouTube URL
   - Spotify show URL
   - Spotify episode URL
   - MP3 URL
   - SRT URL
   - 封面圖 URL

驗收：

1. Supabase 中能查到四篇辯論。
2. 每篇辯論的段落順序正確。
3. 媒體呈現規則資料完整。
4. 發布狀態與發布時間正確。

### 第四階段：首頁改讀 Supabase

目的：讓首頁不再依賴 `debates.json` 作為唯一資料來源。

工作項目：

1. 修改 `portal.js`，從 Supabase 讀取 `debates`。
2. 只顯示 `status = published` 且 `publish_at <= now()` 的辯論。
3. 保留 `debates.json` 作為短期 fallback。
4. 首頁卡片顯示：
   - 標題
   - 摘要
   - 發布日期
   - 正反方與裁判
   - 勝方
   - 點閱數
   - YouTube / Podcast 狀態

驗收：

1. 未登入讀者可以正常看到已發布文章。
2. 未到發布時間的文章不會出現在首頁。
3. Supabase 連線失敗時，首頁仍能用 fallback 顯示現有文章。

### 第五階段：建立動態辯論頁

目的：從每篇獨立 HTML 改為單一模板。

工作項目：

1. 建立動態頁面，例如 `debates/view/?slug=death-penalty` 或 `debates/death-penalty/` 搭配共用 JS。
2. 依 slug 讀取 `debates`、`debate_segments`、`debate_scorecards`、`debate_media`。
3. 媒體區依資料狀態自動呈現：
   - YouTube 有網址：嵌入 YouTube。
   - YouTube 無網址：顯示製作中。
   - Spotify 單集有網址：顯示 Spotify。
   - Spotify 單集無網址但有 MP3：顯示 MP3。
4. 留言、整篇按讚、段落認同、點閱接入新 uuid 結構。

驗收：

1. 四篇辯論都能透過同一套模板顯示。
2. 舊網址仍能導向新模板或正常顯示。
3. YouTube / Spotify / MP3 切換規則正確。
4. 段落按讚不會混到其他文章或段落。

### 第六階段：建立管理後台

目的：讓站主可以在網站上管理文章與影音，不必直接改檔案。

第一版功能：

1. 管理者登入檢查。
2. 辯論列表。
3. 新增與編輯辯論基本資料。
4. 設定 `status` 與 `publish_at`。
5. 貼上 YouTube、Spotify、MP3、SRT、封面網址。
6. 留言軟刪除。

驗收：

1. 非管理者無法進入後台。
2. 管理者可建立草稿。
3. 管理者可設定星期五 17:00 發布。
4. 管理者可在 Spotify URL 產生後補上，前台自動切換。

### 第七階段：移除舊依賴

目的：在新系統穩定後，降低重複維護成本。

工作項目：

1. 將 `debates.json` 改為備份或移除。
2. 舊的每篇 `index.html` 改成重導或靜態備份。
3. 更新工作流程文件，將「寫入 Supabase」列為正式上架步驟。
4. 保留 Markdown、SRT、音檔、影片作產製與備份資產。

驗收：

1. 新文章可以完全透過資料庫與後台發布。
2. 不再需要手動改首頁 HTML 或每篇 HTML。
3. 舊網址不失效。

## 風險與對策

### 風險：RLS 設定錯誤導致草稿外洩

對策：

- 前台查詢必須限制 `status = published` 與 `publish_at <= now()`。
- RLS policy 也要限制一般讀者只能讀取已發布資料。
- 管理者查詢使用 role 判斷。

### 風險：資料遷移後舊互動資料對不上

對策：

- 初期保留 slug 作為轉接欄位。
- 新舊資料並行一段時間。
- 建立 slug 到 uuid 的 mapping。

### 風險：Spotify 單集網址無法預先取得

對策：

- `debate_media` 允許 `spotify_episode` 狀態為 `pending`。
- 前台 fallback 到 `mp3`。
- 管理者後台補上 Spotify 後自動切換。

### 風險：一次改太多造成網站不穩

對策：

- 每階段獨立部署。
- 首頁先改讀資料庫，辯論頁晚一點再改。
- 每階段都保留 fallback。

## 建議下一步

1. 審閱 `docs/database-plan.md` 與本文件。
2. 決定是否接受資料表命名與欄位方向。
3. 撰寫新版 Supabase schema 草案。
4. 建立四篇既有辯論的 seed JSON。
5. 先在本機或 Supabase 測試資料表驗證。

