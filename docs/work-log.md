# 工作日誌

本文件記錄 AI 辯論網站的開發、內容、部署與外部服務設定變更。之後每一項功能、內容、資料庫、登入、部署或設計調整，都必須在這裡登錄。

## 登錄規則

1. 每次變更完成後，必須新增一筆工作日誌。
2. 若變更尚未 commit / push，也要標註目前狀態。
3. 不記錄密碼、OAuth secret、service role key 或任何不可公開的憑證。
4. 若涉及外部服務，例如 Supabase、Google Cloud、GitHub Pages，需記錄做了什麼設定，但不記錄敏感值。
5. 每筆紀錄至少包含：日期、類型、摘要、影響範圍、驗證狀態、後續事項。

## 類型標籤

| 類型 | 說明 |
| --- | --- |
| `content` | 新增或修改辯論內容、Markdown、音訊 |
| `frontend` | 修改首頁、辯論頁、互動介面、CSS |
| `backend` | Supabase schema、RLS、Auth、外部資料服務 |
| `docs` | 文件、流程、工作日誌 |
| `deploy` | GitHub Pages、commit、push、上線檢查 |
| `ops` | 帳號、權限、設定、維護工作 |

---

## 2026-05-16

### docs：建立 AI 辯論網站流程文件

**摘要**  
新增 `docs/debate-workflow.md`，定義 AI 辯論網站的標準運作流程。

**影響範圍**

- 角色分配規則
- 辯論輪次
- 裁判評分規格
- Markdown / HTML / 語音 / GitHub Pages 產出流程
- 候選 AI 角色池

**驗證狀態**  
已確認文件存在於 `docs/debate-workflow.md`。

**後續事項**  
之後若辯論流程、候選模型或部署方式改變，需同步更新此文件。

### docs：擴充 AI 角色候選池

**摘要**  
將 `xAI Grok`、`DeepSeek`、`Microsoft Copilot` 加入正式候選池，可擔任正方、反方或裁判。

**影響範圍**

- `docs/debate-workflow.md`
- 角色分配 prompt
- 候選模型策略

**驗證狀態**  
已確認文件中正式候選池包含 Codex / OpenAI、Gemini、Claude、xAI Grok、DeepSeek、Microsoft Copilot。

**後續事項**  
實際使用前仍需確認各服務登入狀態、可用性與輸出品質。

### frontend：調整入口頁裁判資訊與辯論頁角色資訊

**摘要**  
入口頁移除固定裁判欄位，避免讓讀者誤以為所有辯論都固定由 Claude 擔任裁判。每篇辯論頁新增角色區塊，明確列出裁判、正方、反方。

**影響範圍**

- `index.html`
- `styles.css`
- `debates/robot-tax/index.html`
- `debates/euthanasia/index.html`
- `debates/school-phone/index.html`

**驗證狀態**  
已用本機頁面確認入口頁不再顯示固定裁判欄位，三篇辯論頁都有顯示裁判、正方、反方。

**後續事項**  
新增辯論頁時，必須在頁首加入本場角色資訊。

### backend：建立 Supabase 互動功能資料結構

**摘要**  
新增 Supabase schema，用於 Google 登入後的 profile、辯論按讚與留言功能。

**影響範圍**

- `supabase/schema.sql`
- Supabase project：`AI Debate Archive`
- 資料表：`profiles`、`debate_likes`、`debate_comments`
- RLS 權限：公開讀取、登入後按讚與留言、管理者刪留言

**驗證狀態**  
已在 Supabase SQL Editor 執行初始化 SQL，並查詢確認三張資料表存在。也以公開 publishable key 測試 REST API，讀取讚數與留言皆回 `200 OK`。

**後續事項**  
使用者完成第一次 Google 登入後，需將管理者帳號的 `profiles.is_admin` 設為 `true`。

### backend：設定 Supabase Auth 與 Google OAuth

**摘要**  
建立並設定 Google OAuth 登入，使網站可透過 Supabase Auth 使用 Google 帳號登入。

**影響範圍**

- Supabase Auth Google provider
- Supabase Site URL
- Supabase Redirect URLs
- Google Cloud OAuth Client
- `supabase-config.js`

**驗證狀態**  
Google provider 已啟用。`supabase-config.js` 已填入 Supabase Project URL 與前端公開 publishable key。不可公開的 Google OAuth secret 僅填入 Supabase，未寫入 repo。

**後續事項**  
需由使用者親自點擊「使用 Google 登入」完成第一次登入，之後再設定管理者權限並測試刪留言。

### frontend：新增按讚與留言互動區

**摘要**  
新增共用前端互動腳本，讓每篇辯論頁可顯示 Google 登入、按讚、留言與管理者刪留言介面。

**影響範圍**

- `engagement.js`
- `supabase-config.js`
- `styles.css`
- `debates/robot-tax/index.html`
- `debates/euthanasia/index.html`
- `debates/school-phone/index.html`

**驗證狀態**  
本機頁面已確認互動區會顯示「使用 Google 登入」、按讚與留言介面。尚未完成實際登入後的按讚、留言、刪除測試。

**後續事項**  
等待使用者完成 Google 登入，再測試登入後互動流程。

### docs：新增 Supabase 設定文件

**摘要**  
新增 `docs/supabase-auth-setup.md`，記錄 Supabase Google 登入、資料表、RLS、管理者設定與前端公開 key 的使用方式。

**影響範圍**

- `docs/supabase-auth-setup.md`

**驗證狀態**  
已依目前實作更新文件，並補充 Supabase 新版 `Publishable key` 與舊版 `anon public key` 的對應關係。

**後續事項**  
完成實際登入與管理者測試後，需補充測試結果。

### docs：建立工作日誌制度

**摘要**  
新增本文件 `docs/work-log.md`，作為專案後續所有變更的登錄位置。

**影響範圍**

- `docs/work-log.md`
- `docs/debate-workflow.md`

**驗證狀態**  
已建立工作日誌，並補登今日主要變更。

**後續事項**  
之後每一項功能、內容、資料庫、登入、部署或設計調整，都必須在本文件新增紀錄。

### frontend / deploy：建立真正預約發布流程

**摘要**  
採用「真正預約發布」方案。GitHub Pages 不再直接部署整個 repo 根目錄，而是先由建置腳本產生 `dist/`，只把已發布或已到 `publishAt` 的辯論頁放進正式網站 artifact。

**影響範圍**

- `.github/workflows/static.yml`
- `scripts/build-site.mjs`
- `site-data/debates.json`
- `portal.js`
- `index.html`
- `styles.css`
- `drafts/README.md`
- `docs/publishing-schedule.md`
- `.gitignore`

**驗證狀態**  
已執行 `node scripts/build-site.mjs`，成功建立 `dist/`，其中包含 3 篇已發布辯論，且不包含 `docs/`、`drafts/`、`supabase/` 或 `.github/`。已用本機伺服器檢查首頁可從 `debates.json` 載入 3 篇議題，且無瀏覽器 console error。

**後續事項**  
之後新增預約辯論時，需將完整頁面放入 `drafts/debates/<slug>/`，並在 `site-data/debates.json` 設定 `status: "scheduled"` 與 `publishAt`。若 repo 是 public，草稿雖不會部署到 GitHub Pages，但仍可能被 GitHub 原始碼瀏覽者看到；真正保密的草稿應放在私有來源。

### docs：新增 Podcast 產出規劃

**摘要**  
將 Podcast 納入每篇辯論的標準產出規劃。Podcast 版本只保留正方與反方辯論內容，不包含裁判評分或勝負判定，之後可上傳到 YouTube 的 Podcast 頻道供讀者收聽。

**影響範圍**

- `docs/debate-workflow.md`
- `docs/work-log.md`

**驗證狀態**  
已在流程文件新增 Podcast 產出規格、檔案建議位置、品質控管項目與未來可擴充方向。

**後續事項**  
之後新增每篇辯論時，需同步產生 Podcast 用音訊與 `podcast-notes.md`。目前尚未實作 YouTube 上傳流程，初期規劃為手動上傳。

### frontend / backend：設定管理者並修正登入回跳

**摘要**  
使用者完成第一次 Google 登入後，已在 Supabase 將該 profile 設為管理者。測試時發現登入 redirect URL 原本帶有 `#engagement`，與 Supabase OAuth 回傳的 hash token 衝突，導致前端無法正確建立登入 session；已改成回跳到辯論頁本身，再由前端於 session 建立後清理網址並導向互動區。

**影響範圍**

- Supabase `profiles.is_admin`
- `engagement.js`
- `docs/work-log.md`

**驗證狀態**  
Supabase SQL 查詢已確認管理者欄位為 `true`。登入回跳修正已完成，但需要使用者重新點擊一次「使用 Google 登入」後，再測試按讚、留言與管理者刪留言。

**後續事項**  
使用者重新登入後，需完成按讚、留言、刪除留言的端到端測試。

### frontend：強化舊登入網址相容處理

**摘要**  
使用者重新登入後仍停在舊式 `#engagement#access_token` 雙 hash 網址。新增前端相容處理，偵測到巢狀 `#access_token` 時會先整理為 Supabase 可解析的 OAuth hash；同時為 `engagement.js` 加上版本參數，避免瀏覽器沿用舊快取。

**影響範圍**

- `engagement.js`
- `debates/robot-tax/index.html`
- `debates/euthanasia/index.html`
- `debates/school-phone/index.html`
- `docs/work-log.md`

**驗證狀態**  
已完成程式修改。重新登入後，頁面成功辨識管理者，網址中不再保留 OAuth token。

**後續事項**  
登入狀態已確認，已進一步完成按讚、留言與管理者刪留言測試。

### frontend / backend：完成互動功能端到端測試

**摘要**  
完成 Google 登入後的互動功能測試，確認管理者身份、按讚、留言與刪留言流程可用。

**影響範圍**

- Supabase Auth session
- Supabase `debate_likes`
- Supabase `debate_comments`
- `engagement.js`
- 本機辯論頁 `debates/robot-tax/`

**驗證狀態**  
已確認頁面顯示管理者登入狀態。已成功按讚。已成功送出測試留言「管理者功能測試留言，稍後會刪除。」並成功由管理者刪除。刪除後測試留言不再顯示。

**後續事項**  
下一步可整理目前變更，commit / push 並部署到 GitHub Pages，再於正式網址測試登入、按讚與留言。

### deploy / verification：正式站部署與互動功能驗證

**目的**  
確認本次 `79d310f` 部署到 GitHub Pages 後，入口首頁、辯論頁、Google 登入、管理者權限、按讚、留言與刪除留言功能都能在正式站正常運作。

**影響檔案**  

- `docs/work-log.md`

**驗證結果**  
GitHub Actions 部署成功，正式站首頁可正常載入 3 篇辯論卡片；「機器人稅」辯論頁可正常顯示角色資訊與互動區。正式站 Google 登入成功，登入後可辨識管理者身分；已完成留言新增、管理者刪除留言、按讚與取消按讚測試。測試留言已刪除，測試按讚已取消，瀏覽器 console 未發現錯誤。

**下一步**  
後續新增辯論題目時，依照既有流程建立內容、音訊、發布設定與工作日誌紀錄，再提交並部署。
