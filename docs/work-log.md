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

### content：新增「我國應廢除死刑」排程辯論

**目的**  
依照 AI 辯論網站流程，新增辯論題目「我國應廢除死刑」，並排定於 2026-05-22 17:00（Asia/Taipei）發布。

**角色分配**  

- 正方：Claude
- 反方：Gemini
- 裁判：Codex / OpenAI

**影響檔案**  

- `debates/death-penalty/debate.md`
- `debates/death-penalty/index.html`
- `debates/death-penalty/app.js`
- `debates/death-penalty/generate-audio.py`
- `debates/death-penalty/podcast/podcast-notes.md`
- `site-data/debates.json`
- `styles.css`
- `docs/work-log.md`

**驗證結果**  
已建立辯論原稿、網頁頁面、前端渲染腳本、音訊生成腳本與 Podcast 備註。後續需產生語音檔、執行網站建置，並確認排程發布資料能正確被 `scripts/build-site.mjs` 處理。

**下一步**  
產生各段語音與 Podcast 音訊，執行建置驗證，再提交並推送到 GitHub。

### content / verification：「我國應廢除死刑」語音與排程預覽驗證

**目的**  
確認「我國應廢除死刑」辯論的語音檔、Podcast 音訊、排程建置與本機預覽均可正常運作。

**影響檔案**  

- `debates/death-penalty/audio/*.mp3`
- `debates/death-penalty/podcast/debate-podcast.mp3`
- `docs/work-log.md`

**驗證結果**  
已產生正方、反方、裁判共 7 個分段語音檔，並產生只包含正反方內容的 Podcast 音訊。執行一般建置時，因尚未到發布時間，網站輸出維持 3 篇已發布辯論；以 `PUBLISH_NOW=2026-05-22T17:01:00+08:00` 模擬發布後，網站輸出 4 篇辯論。本機預覽確認首頁可看到「我國應廢除死刑」卡片，辯論頁可看到角色資訊、7 個音訊播放器與互動區，瀏覽器 console 未發現錯誤。

**下一步**  
提交並推送到 GitHub。正式站會先維持目前已發布內容，等到排程時間後由 GitHub Actions 自動發布新辯論。

### media：建立 Podcast 影片產生流程

**目的**  
將已完成的 Podcast 音訊延伸為 YouTube 可用的影片版本，包含中文字幕、司法議題視覺背景與 AI 主持人角色，避免只有靜態字幕造成畫面單調。

**影響檔案**  

- `scripts/create-podcast-video.py`
- `.gitignore`
- `docs/work-log.md`

**設計方向**  
影片流程使用每篇辯論的 `podcast/debate-podcast.mp3` 作為音訊來源，從 `debate.md` 擷取正反方段落產生字幕。畫面採原創生成的司法與公共討論風格背景，並加入 AI 主持人角色。輸出檔放在 `debates/<slug>/video/output/`，此資料夾列入 `.gitignore`，避免大型影片檔直接進入 Git repository。

**下一步**  
以 `death-penalty` 辯論實際產出第一支 Podcast 影片，確認字幕、音訊與畫面可正常播放。

### media / verification：產出「我國應廢除死刑」Podcast 影片

**目的**  
將「我國應廢除死刑」Podcast 音訊製作成 YouTube 可上傳的 16:9 影片，包含中文字幕、視覺背景、進度列與 AI 主持人角色。

**影響檔案**  

- `scripts/create-podcast-video.py`
- `scripts/video-requirements.txt`
- `docs/work-log.md`
- `debates/death-penalty/video/output/podcast-video.mp4`（本機輸出，不進 Git）
- `debates/death-penalty/video/output/captions.srt`（本機輸出，不進 Git）
- `debates/death-penalty/video/output/video-notes.md`（本機輸出，不進 Git）

**驗證結果**  
已產生 `podcast-video.mp4`，影片長度約 6 分 22 秒，解析度 1280x720，包含 Podcast 音訊、中文字幕、原創司法議題背景與 AI 主持人角色。已擷取 70 秒處預覽圖確認字幕、標題、角色標示與畫面對比正常。

**下一步**  
若要上傳 YouTube，可使用本機輸出的 `podcast-video.mp4`。後續其他辯論可沿用同一支腳本產生影片版。

### media：調整 Podcast 影片與字幕策略

**目的**  
依照回饋修正 Podcast 影片流程：逐字字幕不再燒進影片畫面，而是輸出獨立 SRT 檔，供 YouTube 上傳時作為字幕軌使用；影片畫面改為抓住段落重點、搭配視覺提示與 AI 主持人，避免字幕與畫面互相牽制。

**影響檔案**  

- `scripts/create-podcast-video.py`
- `docs/work-log.md`
- `debates/death-penalty/video/output/podcast-video.mp4`（本機輸出，不進 Git）
- `debates/death-penalty/video/output/captions.srt`（本機輸出，不進 Git）

**驗證結果**  
已重新產出「我國應廢除死刑」影片。新版 MP4 保留音訊、段落重點、視覺提示、進度列與 AI 主持人，但不再顯示逐字字幕；已另外輸出 `captions.srt`，可於上傳 YouTube 時一併載入。已擷取 70 秒與 270 秒預覽圖，確認畫面不再被逐字字幕綁住，段落視覺與重點文字可正常顯示。

**下一步**  
後續可把影片素材再升級為外部照片或短片素材庫，但字幕流程固定採「MP4 + SRT」雙檔上傳。

### media：保留 YouTube 字幕安全區

**目的**  
調整 Podcast 影片版面，避免 YouTube 載入 SRT 字幕後與影片底部資訊、進度列或 AI 主持人重疊。

**影響檔案**  

- `scripts/create-podcast-video.py`
- `docs/work-log.md`

**變更內容**  
將主持人、段落重點、進度列與提示文字整體上移，影片底部保留乾淨的字幕安全區。影片畫面只保留「底部保留給 YouTube 字幕」的輕提示，位置也放在字幕區上方。

**下一步**  
重新產出「我國應廢除死刑」Podcast 影片，確認下方留白足以容納 YouTube 字幕。

### media / verification：重新輸出字幕安全區影片

**目的**  
依照 YouTube 字幕顯示需求，進一步清空影片底部，避免任何提示文字或進度列影響字幕可讀性。

**影響檔案**  

- `scripts/create-podcast-video.py`
- `docs/work-log.md`
- `debates/death-penalty/video/output/podcast-video.mp4`（本機輸出，不進 Git）

**驗證結果**  
已將進度列移到畫面上方，移除底部提示文字，並將 AI 主持人上移。影片底部保留為字幕安全區，供 YouTube 載入 SRT 後顯示逐字字幕。

**下一步**  
重新產出影片並截圖確認底部字幕區乾淨。

### media / verification：確認 YouTube 字幕安全區

**目的**  
確認新版 Podcast 影片底部足以容納 YouTube SRT 字幕，不會與進度列、提示文字或主持人重疊。

**影響檔案**  

- `scripts/create-podcast-video.py`
- `docs/work-log.md`
- `debates/death-penalty/video/output/podcast-video.mp4`（本機輸出，不進 Git）
- `debates/death-penalty/video/output/preview-70s.jpg`（本機輸出，不進 Git）
- `debates/death-penalty/video/output/preview-270s.jpg`（本機輸出，不進 Git）

**驗證結果**  
已重新輸出影片並擷取 70 秒、270 秒預覽圖。新版將進度列放在標題下方，移除底部提示文字，AI 主持人與重點文字均上移；畫面底部保留乾淨空間，適合 YouTube 載入 SRT 字幕後顯示。

**下一步**  
後續所有 Podcast 影片沿用此字幕安全區配置。

### media：新增語音辨識 SRT 產生流程

**目的**  
修正「我國應廢除死刑」SRT 時間軸與 Podcast 影片不合的問題。原本 SRT 以文字長度推估時間，容易與實際聲音偏移；改為使用語音辨識直接聽 `debate-podcast.mp3`，依真實音訊切出字幕時間軸。

**影響檔案**  

- `scripts/transcribe-podcast-srt.py`
- `scripts/video-requirements.txt`
- `docs/work-log.md`

**變更內容**  
新增 `scripts/transcribe-podcast-srt.py`，使用 faster-whisper 在本機 CPU 進行繁體中文 Podcast 語音辨識，輸出 `debates/<slug>/video/output/captions.srt`。此流程之後可套用到每一集 Podcast。

**下一步**  
使用新腳本重新產出 `death-penalty` 的 SRT，並抽查時間軸與字幕內容。

### media / verification：重新產出「廢除死刑」語音辨識 SRT

**目的**  
使用方法一重新產出「我國應廢除死刑」Podcast 的 SRT 字幕，改善原本以文字長度推估造成的時間軸不準問題。

**影響檔案**  

- `scripts/transcribe-podcast-srt.py`
- `docs/work-log.md`
- `debates/death-penalty/video/output/captions.srt`（本機輸出，不進 Git）
- `debates/death-penalty/video/output/captions-asr-raw.srt`（本機輸出，不進 Git）

**驗證結果**  
已使用 faster-whisper `small` 模型辨識 `debate-podcast.mp3`，偵測語言為中文，輸出 60 格字幕。最終 `captions.srt` 採「Whisper 語音辨識時間軸 + 原始辯論稿文字」：時間軸由實際音訊取得，字幕文字避免 ASR 誤字。抽查顯示字幕結尾時間為 `00:06:22,570`，接近音訊長度約 382.752 秒；平均每格約 42 字，最長 59 字，未發現先前常見 ASR 誤字。

**下一步**  
上傳 YouTube 時使用新版 `podcast-video.mp4` 搭配新版 `captions.srt`。後續若需要更細字幕，可改用較大的 Whisper 模型或再提高字幕格數。

### media：修正 Podcast 音訊完整性流程

**目的**  
排查 SRT 中段錯位時，發現現有 `debate-podcast.mp3` 並未完整包含六段正反方辯論，導致後段字幕即使時間軸正確也無法與影片聲音相符。新增 Podcast 音訊串接流程，直接使用已產生的六個分段 MP3 組成完整 Podcast。

**影響檔案**  

- `scripts/build-podcast-audio.py`
- `docs/work-log.md`
- `debates/death-penalty/podcast/debate-podcast.mp3`（內容將重新產出）

**變更內容**  
新增 `scripts/build-podcast-audio.py`，依序串接正方申論、反方申論、正方駁論、反方駁論、反方結辯、正方結辯六個音訊檔，輸出完整的 `podcast/debate-podcast.mp3`。此流程可避免單次長文本 TTS 可能截斷內容。

**下一步**  
重新產出完整 Podcast 音訊，接著重新產生影片與 SRT。

### media / verification：重建完整 Podcast、影片與 SRT

**目的**  
完成「我國應廢除死刑」Podcast 音訊截斷問題修正。原本 `debate-podcast.mp3` 只到反方駁論附近，導致 SRT 中段後即使使用語音辨識時間軸也會對不上；本次改以六段分段音訊串接成完整 Podcast，再重新輸出影片與字幕。

**影響檔案**  

- `scripts/build-podcast-audio.py`
- `docs/work-log.md`
- `debates/death-penalty/podcast/debate-podcast.mp3`
- `debates/death-penalty/video/output/podcast-video.mp4`（本機輸出，不進 Git）
- `debates/death-penalty/video/output/captions.srt`（本機輸出，不進 Git）
- `debates/death-penalty/video/output/captions-asr-raw.srt`（本機輸出，不進 Git）

**驗證結果**  
已重新串接六段 Podcast 音訊，完整音檔長度約 `00:10:17`。重新產生影片後，MP4 長度為 `00:10:17.07`。重新執行 faster-whisper SRT 流程後輸出 66 格字幕，最後一格時間為 `00:10:16,610`，內容已涵蓋正方結辯尾段。另擷取 70 秒、450 秒、585 秒預覽圖，確認畫面可正常輸出，並保留底部 YouTube 字幕安全區。

**下一步**  
之後每集 Podcast 先使用 `scripts/build-podcast-audio.py <slug>` 從分段音訊建立完整音檔，再依序產生影片與 SRT，避免長文本 TTS 截斷造成字幕無法校準。

### media：改用源頭同步字幕與語音流程

**目的**  
解決 SRT 即使用 Whisper 或比例推估仍會中段錯位的問題。新流程改為先把辯論逐字稿切成短字幕，再逐格產生 TTS 音訊，最後依每一格 MP3 的實際長度累積時間碼，讓 Podcast 音檔與 SRT 從源頭同步。

**影響檔案**  

- `scripts/build-synced-podcast.py`
- `scripts/create-podcast-video.py`
- `.gitignore`
- `docs/work-log.md`
- `debates/death-penalty/podcast/debate-podcast.mp3`
- `debates/death-penalty/podcast/captions-source.json`
- `debates/death-penalty/video/output/captions.srt`（本機輸出，不進 Git）
- `debates/death-penalty/video/output/podcast-video.mp4`（本機輸出，不進 Git）

**變更內容**  
新增 `scripts/build-synced-podcast.py`，預設以每格字幕最多 15 字切分 Podcast 逐字稿，使用不同 TTS 聲音產生正方與反方分段音訊，再串接成完整 `debate-podcast.mp3`。同步產生 `captions-source.json` 與 YouTube 用 `captions.srt`。`scripts/create-podcast-video.py` 也改為優先讀取 `podcast/captions-source.json`，避免重新用總長度比例推估字幕時間。

**驗證結果**  
已重新產出「我國應廢除死刑」Podcast、YouTube 影片與字幕。新版 SRT 共 198 格，最長 15 字，超過 15 字的字幕格數為 0。Podcast 音檔長度為 `00:12:48.84`，影片長度為 `00:12:48.82`，最後一格字幕時間為 `00:12:48,840`。另擷取 70 秒、380 秒、740 秒預覽圖，確認畫面正常且底部仍保留 YouTube 字幕安全區。

**下一步**  
後續 Podcast 影片一律使用「先字幕、後語音、再串接」流程；若覺得字幕切字過硬，可再新增中文斷詞或人工微調字幕稿，但時間軸仍由每格音訊長度自動生成。

### media：改為文句式字幕並更換正方語音

**目的**  
修正 15 字硬限制導致語句被切斷、段落感過重，以及正方語音過於機械化的問題。同時降低因大量短音檔串接造成的停頓落差。

**影響檔案**  

- `scripts/build-synced-podcast.py`
- `docs/work-log.md`
- `debates/death-penalty/podcast/debate-podcast.mp3`
- `debates/death-penalty/podcast/captions-source.json`
- `debates/death-penalty/video/output/captions.srt`（本機輸出，不進 Git）
- `debates/death-penalty/video/output/podcast-video.mp4`（本機輸出，不進 Git）

**變更內容**  
取消每格 15 字硬切，改成優先依完整文句切字幕；若句子過長，再依逗號、頓號、分號、冒號等自然語氣點拆成片語。正方語音由 `zh-TW-HsiaoYuNeural` 改為 `zh-TW-YunJheNeural`，反方維持 `zh-TW-HsiaoChenNeural`。同步音訊段數由 198 段降為 90 段，以減少段與段之間的接縫感。

**驗證結果**  
已重新產出「我國應廢除死刑」Podcast、YouTube 影片與 SRT。新版 SRT 共 90 格，最長 42 字。Podcast 音檔長度為 `00:09:06.62`，影片長度為 `00:09:06.60`，最後一格字幕時間為 `00:09:06,624`。另擷取 70 秒、270 秒、520 秒預覽圖，確認畫面正常且底部仍保留 YouTube 字幕安全區。

**下一步**  
若仍覺得分段接縫明顯，下一版可嘗試「整段 TTS + WordBoundary/Bookmark 時間標記」來取得字幕時間，讓每個申論段落連續朗讀，同時保留精準 SRT。

### media：裁切每段 TTS 尾端停頓

**目的**  
改善文句式 TTS 分段串接時，每一小段尾端約 0.5 秒停頓造成的接縫感。

**影響檔案**  

- `scripts/build-synced-podcast.py`
- `docs/work-log.md`
- `debates/death-penalty/podcast/debate-podcast.mp3`
- `debates/death-penalty/podcast/captions-source.json`
- `debates/death-penalty/video/output/captions.srt`（本機輸出，不進 Git）
- `debates/death-penalty/video/output/podcast-video.mp4`（本機輸出，不進 Git）

**變更內容**  
在每段 TTS 產生後，改用固定尾端裁切流程處理，預設從每段尾端裁掉 `0.45` 秒。曾測試自動靜音偵測，但判斷過度激進，可能誤裁人聲，因此改用固定尾端裁切，避免讓演算法誤判語音內容。

**驗證結果**  
重新產出「我國應廢除死刑」Podcast、影片與 SRT。新版仍維持 90 格字幕，總裁切約 `34.56` 秒，平均每段裁切約 `0.384` 秒。Podcast 音檔長度為 `00:08:32.06`，影片長度為 `00:08:32.00`，最後一格字幕時間為 `00:08:32,064`。

**下一步**  
試聽新版 Podcast，若仍覺得接縫明顯，可改走整段 TTS 搭配時間標記，讓每個大段連續朗讀。

### video：調整段落與發言者標示位置

**目的**  
改善 Podcast 影片中「目前段落」標示位置不明顯的問題，讓觀眾能一眼看出目前是正方申論、反方駁論或結辯，同時看到目前發言的 AI 角色。

**影響檔案**  

- `scripts/create-podcast-video.py`
- `docs/work-log.md`
- `debates/death-penalty/video/output/podcast-video.mp4`（本機輸出，不進 Git）
- `debates/death-penalty/video/output/preview-speaker-30s.jpg`（本機輸出，不進 Git）
- `debates/death-penalty/video/output/preview-speaker-190s.jpg`（本機輸出，不進 Git）
- `debates/death-penalty/video/output/preview-speaker-470s.jpg`（本機輸出，不進 Git）

**變更內容**  
將人像上移，並在人像下方新增發言狀態牌。狀態牌會顯示「目前發言」與 AI 名稱，例如 Claude、Gemini、OpenAI，以及目前段落，例如正方申論、反方申論、正方結辯。左側重點文字框也略為縮短，避免與右側狀態牌重疊。

**驗證結果**  
已重新輸出「我國應廢除死刑」Podcast 影片，並擷取 30 秒、190 秒、470 秒預覽圖。截圖確認 Claude / Gemini 與段落名稱都位於人像下方，位置清楚，且未與左側重點文字框重疊。

**下一步**  
後續所有 Podcast 影片沿用此發言狀態牌版面。

### video：調整 Podcast 影片發言狀態區位置
**目的**
依照版面確認結果，將 Podcast 影片右側人像與下方發言狀態牌往上移，讓發言狀態牌上緣與左側重點文字框上緣對齊，提升觀眾辨識目前發言者與辯論段落的速度。

**變更檔案**

- `scripts/create-podcast-video.py`
- `docs/work-log.md`
- `debates/death-penalty/video/output/podcast-video.mp4`（重新產生，未納入 Git）
- `debates/death-penalty/video/output/preview-speaker-30s.jpg`（重新產生，未納入 Git）
- `debates/death-penalty/video/output/preview-speaker-190s.jpg`（重新產生，未納入 Git）
- `debates/death-penalty/video/output/preview-speaker-470s.jpg`（重新產生，未納入 Git）

**變更說明**
將影片主持人人像座標上移，並把右側「目前發言 / AI 名稱 / 辯論段落」狀態牌調整到與左側重點文字框同高。已重新產生「我國應廢除死刑」Podcast 影片，並擷取 30 秒、190 秒、470 秒三個預覽畫面確認版面位置一致。

**目前狀態**
本次調整只影響影片產生流程與重新產生的本機影片輸出。輸出的影片與預覽圖仍位於 `debates/death-penalty/video/output/`，依既有規則不納入 Git。

### docs：整理 Podcast 影片製作準則
**目的**
將已穩定下來的 Podcast 影片製作流程正式整理進流程文件，作為未來每一篇辯論製作 YouTube 影片版時的標準。

**變更檔案**

- `docs/debate-workflow.md`
- `docs/work-log.md`

**變更說明**
在 `docs/debate-workflow.md` 的 Podcast 產出規格下新增「Podcast 影片製作準則」，明確記錄產出順序、字幕與音訊規則、影片畫面規則、檔案位置與驗證標準。準則包含先產生同步 Podcast 與 SRT、再產生影片、影片不燒逐字字幕、底部保留 YouTube 字幕安全區、發言狀態牌需顯示目前 AI 與辯論段落等要求。

**目前狀態**
未來新增辯論題目時，Podcast 影片可直接依此準則執行；若日後改用整段 TTS 搭配 WordBoundary 或新增素材庫，也需同步更新本流程文件。

### docs：建立影音上架流程與集數資料表
**目的**
建立 Podcast 與 YouTube 影片的上架準則，並開始集中記錄每一集的標題、說明、封面、檔案路徑與上架網址，方便之後由 Codex 協助實際上傳。

**變更檔案**

- `docs/publishing-workflow.md`
- `docs/episode-publishing.md`
- `docs/work-log.md`

**變更說明**
新增 `docs/publishing-workflow.md`，定義半自動上架模式、YouTube 上架流程、Podcast 上架流程、標題格式、說明文字格式、封面規格與回填規則。新增 `docs/episode-publishing.md`，建立每集上架資料範本，並先填入「我國應廢除死刑」的 YouTube 標題、YouTube 說明、Podcast 標題、Podcast 說明、影片檔、字幕檔與音訊檔路徑。

**目前狀態**
「我國應廢除死刑」目前標記為 `ready`，可作為第一次上架測試集。縮圖與 Podcast 封面尚未製作，待後續確認視覺風格後補上。

### publishing：準備 EP001 上架包並測試 Chrome 上架連線
**目的**
開始實際測試「我國應廢除死刑」的 YouTube 與 Podcast 上架流程，確認素材是否齊全，並嘗試由 Codex 透過 Chrome 協助進入 YouTube Studio 操作。

**變更檔案**

- `debates/death-penalty/publishing/youtube-thumbnail.png`
- `debates/death-penalty/publishing/podcast-cover.png`
- `debates/death-penalty/publishing/episode-notes.md`
- `docs/work-log.md`

**變更說明**
新增本集 YouTube 16:9 縮圖與 Podcast 1:1 封面，並建立 `episode-notes.md`，集中放置本集上架標題、說明、素材路徑與檢查清單。已確認影片、字幕、Podcast 音訊、縮圖與封面皆存在且檔案大小正常。

**目前狀態**
Chrome、Codex Chrome Extension 與本機 native host 檢查皆正常，但實際連線 YouTube Studio 時回報 native pipe closed，暫時無法由 Codex 直接操作 Chrome 上傳。下一步需先修復或重啟 Chrome 擴充連線；在此之前，可依 `episode-notes.md` 進行手動上架。

### publishing：確認 EP001 YouTube 已排程
**目的**
重新使用 Chrome 檢查「我國應廢除死刑」YouTube 上架狀態，避免重複上傳，並確認目前還缺哪些平台設定。

**變更檔案**

- `docs/episode-publishing.md`
- `debates/death-penalty/publishing/episode-notes.md`
- `docs/work-log.md`

**變更說明**
重置 Chrome 控制狀態後成功進入 YouTube Studio。頻道內容中已存在「AI辯論所_EP04：我國應廢除死刑」，影片 ID 為 `x9jDcUm1r64`，狀態為已排程，日期為 2026-05-22。進入影片詳細資料後確認影片檔名為 `podcast-video.mp4`，影片連結為 `https://youtu.be/x9jDcUm1r64`，並確認已有「中文（台灣）」字幕與時間碼內容。

**目前狀態**
YouTube 影片已排程且字幕存在。Codex 嘗試上傳自訂縮圖時，Chrome Extension 回報本機檔案上傳權限不足；需到 `chrome://extensions` 的 Codex Extension 詳細資料中啟用「Allow access to file URLs」後，才能由 Codex 代為上傳縮圖或其他本機檔案。

### publishing：重新上傳正式 YouTube 影片受檔案權限阻擋
**目的**
依照使用者指示，不沿用測試用 YouTube 影片，改為重新上傳一支正式影片。

**變更檔案**

- `docs/work-log.md`

**變更說明**
已透過 Chrome 成功進入 YouTube Studio，並開啟「上傳影片」對話框。當 Codex 嘗試選取本機正式影片 `debates/death-penalty/video/output/podcast-video.mp4` 時，Chrome Extension 回報 `Not allowed`，表示目前未允許 Codex Extension 存取本機檔案網址，因此無法由 Codex 代為上傳影片、縮圖或字幕檔。

**目前狀態**
重新上傳流程暫停在 YouTube「選取檔案」步驟。需由使用者手動到 `chrome://extensions`，進入 Codex Extension 詳細資料，啟用「Allow access to file URLs」後再重試。

### publishing：重新上傳並排程 EP001 YouTube 正式影片
**目的**
依照使用者說明，先前 `https://youtu.be/x9jDcUm1r64` 為測試用影片，不沿用該影片，重新上傳一支正式 YouTube 影片並完成排程。

**變更檔案**

- `docs/episode-publishing.md`
- `debates/death-penalty/publishing/episode-notes.md`
- `docs/work-log.md`

**變更說明**
在使用者啟用 Chrome Extension 本機檔案權限後，Codex 成功透過 YouTube Studio 重新上傳 `debates/death-penalty/video/output/podcast-video.mp4`。已填入標題 `AI辯論所_EP04：我國應廢除死刑`、說明文字、自訂縮圖 `youtube-thumbnail.png`，加入 `AI 辯論所` 播放清單，設定非兒童專屬，並上傳「中文（台灣）」SRT 字幕。YouTube 初步檢查顯示著作權與社群規範皆未發現問題。

**目前狀態**
正式影片已排程於 2026-05-22 17:00（GMT+0800）公開，連結為 `https://youtu.be/1sd9BKkhHWQ`。先前測試影片 `https://youtu.be/x9jDcUm1r64` 可由使用者刪除。Podcast 音訊尚未上架，需確認使用的平台與帳號後繼續。

### publishing：建立 Spotify for Creators 節目並排程 EP001 Podcast
**目的**
依照使用者選定的「Spotify for Creators + YouTube」上架策略，建立 Podcast 節目並將「我國應廢除死刑」音訊排程發布。

**變更檔案**

- `docs/episode-publishing.md`
- `debates/death-penalty/publishing/episode-notes.md`
- `docs/work-log.md`

**變更說明**
已透過 Chrome 進入 Spotify for Creators，建立節目 `AI 辯論所`，填入節目簡介、創作者名稱、分類 `新聞評論`、語言 `中文 (繁體)`，並上傳 Podcast 封面 `debates/death-penalty/publishing/podcast-cover.png`。接著建立第一支單集，使用音訊檔 `debates/death-penalty/podcast/debate-podcast.mp3`，填入標題 `我國應廢除死刑` 與 Podcast 說明，保留 Spotify 留言功能開啟，並設定排程發布。

**目前狀態**
Spotify for Creators 單集清單已確認出現 `我國應廢除死刑`，狀態為 `Scheduled`，日期為 2026-05-22，格式為音訊，長度為 08:32。排程時間設定為 2026-05-22 17:00（GMT+8）。Podcast 公開 URL 需等平台發布後再回填。

### frontend / docs：新增辯論頁影音內嵌區規則
**目的**
讓網站讀者能直接在辯論頁觀看 YouTube 影片或收聽 Podcast，並把影音內嵌納入之後每集的標準上架流程。

**變更檔案**

- `debates/death-penalty/index.html`
- `styles.css`
- `docs/publishing-workflow.md`
- `docs/episode-publishing.md`
- `docs/debate-workflow.md`
- `docs/work-log.md`

**變更說明**
在「我國應廢除死刑」頁面新增「YouTube 與 Podcast」區塊，於辯論紀錄前方內嵌 YouTube 影片播放器，並保留 Spotify Podcast 的排程提示位置。新增響應式影音樣式，讓 YouTube iframe 維持 16:9，Podcast 狀態區在手機版可自然堆疊。流程文件同步補上：今後每集上架後都需將 YouTube 與 Podcast embed 回填到網站頁面；Podcast 尚未公開時不可推測網址，先顯示排程狀態。

**目前狀態**
YouTube 已可用 `https://www.youtube.com/embed/1sd9BKkhHWQ` 內嵌。Spotify 單集目前仍為排程狀態，公開 URL 與 embed code 待 2026-05-22 發布後回填。

### deploy：排除本機影音輸出暫存資料夾
**目的**
修正本機建置時會把 `video/output` 的影片輸出與 frame 暫存檔複製進 `dist` 的問題，避免預覽與部署輸出過大或因雲端同步檔案鎖定而失敗。

**變更檔案**

- `scripts/build-site.mjs`
- `docs/work-log.md`

**變更說明**
調整 `scripts/build-site.mjs` 的辯論資料夾複製流程，略過 `video/output/` 與 `podcast/caption-segments/`。這兩個資料夾屬於本機產出或暫存內容，不應進入 Git，也不需要進入 GitHub Pages 的靜態網站輸出。

**目前狀態**
後續執行 `node scripts/build-site.mjs` 時，網站仍會複製辯論頁、文字、互動腳本與網頁使用的分段音訊，但不再複製大型 Podcast 影片輸出與 TTS 分段暫存檔。

### media / frontend：產出 school-phone Podcast 與影片素材
**目的**
開始補齊已公開三篇辯論的影音與 Podcast，上架策略改為製作完成後直接公開。本次先處理「學校是否應全面禁止學生帶手機到學校」。

**變更檔案**

- `scripts/build-synced-podcast.py`
- `scripts/create-podcast-video.py`
- `debates/school-phone/index.html`
- `debates/school-phone/podcast/debate-podcast.mp3`
- `debates/school-phone/podcast/captions-source.json`
- `debates/school-phone/publishing/youtube-thumbnail.png`
- `debates/school-phone/publishing/podcast-cover.png`
- `debates/school-phone/publishing/episode-notes.md`
- `styles.css`
- `docs/episode-publishing.md`
- `docs/work-log.md`

**變更說明**
將 Podcast 與影片產生腳本調整為可依 `slug` 套用不同角色與主題視覺，新增 `school-phone` 的正方 Codex、反方 Gemini 角色設定，以及校園手機主題的視覺提示。已產出 Podcast 音訊、同步字幕來源、YouTube SRT、YouTube 影片、三張影片預覽圖、YouTube 縮圖與 Podcast 封面。網頁新增「YouTube 與 Podcast」區塊，目前先提供網站內 Podcast 音訊播放器，YouTube 與 Spotify 上架後再替換為平台內嵌播放器。

**目前狀態**
`school-phone` Podcast 音訊長度約 17:14，SRT 共 189 格；影片預覽圖已抽查 30 秒、420 秒與 900 秒，畫面中的 OpenAI / Gemini 發言牌、段落標示、重點文字與底部字幕安全區正常。下一步可上傳 YouTube 與 Spotify，取得正式 URL 後回填網站。

### publishing / frontend：回填 EP002 YouTube 與 Spotify 正式連結
**目的**
將使用者已完成上架的「學校是否應全面禁止學生帶手機到學校」YouTube 影片與 Spotify Podcast 單集接回網站，讓入口頁讀者可以直接觀看與收聽。

**變更檔案**

- `debates/school-phone/index.html`
- `styles.css`
- `debates/school-phone/publishing/episode-notes.md`
- `docs/episode-publishing.md`
- `docs/work-log.md`

**變更說明**
將 YouTube 正式網址 `https://youtu.be/iyMHcrXCWHc` 轉為內嵌播放器 `https://www.youtube.com/embed/iyMHcrXCWHc`，替換原本的待上架提示。將 Spotify 單集 `https://open.spotify.com/episode/0iT1XMTXzNsXTUIczrQW8q?si=6Bkr6XsERk6pKpeA60luAQ` 轉為內嵌播放器 `https://open.spotify.com/embed/episode/0iT1XMTXzNsXTUIczrQW8q?utm_source=generator`，並保留網站本機 MP3 播放器作為備援。同步更新 EP002 上架包與總表狀態為 `published`。

**目前狀態**
EP002 網站影音區已改為 YouTube + Spotify 雙播放器。已執行 `node scripts/build-site.mjs`，並在 `http://127.0.0.1:8016/debates/school-phone/?v=20260517-media#media` 預覽確認頁面含 2 個 iframe，來源分別為 YouTube 與 Spotify，且瀏覽器錯誤紀錄為空。

### deploy：修正 GitHub Pages workflow 權限宣告
**目的**
處理 GitHub Pages 部署時 `actions/deploy-pages` 回報 `Ensure GITHUB_TOKEN has permission "id-token: write"` 的問題，讓網站更新能順利發布。

**變更檔案**

- `.github/workflows/static.yml`
- `docs/work-log.md`

**變更說明**
依 GitHub `actions/deploy-pages` 官方建議，將 `contents: read`、`pages: write`、`id-token: write` 權限也明確宣告在 `deploy` job 底下。原本 workflow 層級已宣告相同權限，但本次部署沒有被部署步驟正確辨識，改採 job 層級宣告以貼近官方範例。

**目前狀態**
已重新推送並確認 GitHub Pages workflow `25985349427` 成功完成。線上頁面 `https://clive520.github.io/robot-tax-debate-20260516/debates/school-phone/?v=20260517-media2#media` 已驗證含 2 個 iframe，來源分別為 YouTube 與 Spotify，瀏覽器錯誤紀錄為空。

### media：產出 euthanasia Podcast、影片與上架素材
**目的**
接續補齊已公開辯論「我國應將『積極安樂死』合法化」的 Podcast 音訊、YouTube 影片、字幕、縮圖與 Podcast 封面，並準備後續上架 YouTube 與 Spotify。

**變更檔案**

- `scripts/build-synced-podcast.py`
- `scripts/create-podcast-video.py`
- `debates/euthanasia/podcast/debate-podcast.mp3`
- `debates/euthanasia/podcast/captions-source.json`
- `debates/euthanasia/publishing/youtube-thumbnail.png`
- `debates/euthanasia/publishing/podcast-cover.png`
- `debates/euthanasia/publishing/episode-notes.md`
- `docs/episode-publishing.md`
- `docs/work-log.md`

**變更說明**
將 Podcast 與影片產生腳本補上 `euthanasia` 的正方 Codex、反方 Gemini 角色設定，以及病人自主、生命價值、安寧長照與制度審查等主題視覺提示。已產出同步 Podcast 音訊、字幕來源、YouTube SRT、Podcast 影片、三張影片預覽圖、YouTube 縮圖與 Podcast 封面。新增 EP003 上架包並登錄於上架資料總表。

**目前狀態**
`euthanasia` Podcast 音訊長度約 21:32，SRT 共 229 格；影片預覽圖已抽查 30 秒畫面，OpenAI 發言牌、段落標示、主題視覺與底部字幕安全區正常。網站頁已加入影音區，目前先提供本機 Podcast 音訊播放與 YouTube 待上架提示。這一輪工具環境沒有可用的 Chrome 瀏覽器控制入口，因此尚無法操作 YouTube Studio / Spotify for Creators 上傳；待 Chrome 控制恢復或取得平台連結後，再回填正式 iframe。

### media：回填 euthanasia YouTube 與 Spotify 內嵌連結
**目的**
將使用者完成上架的「我國應將『積極安樂死』合法化」YouTube 影片與 Spotify Podcast 連結接入網站，讓讀者可在辯論頁直接播放影音內容。

**變更檔案**

- `debates/euthanasia/index.html`
- `debates/euthanasia/publishing/episode-notes.md`
- `docs/episode-publishing.md`
- `docs/work-log.md`

**變更說明**
回填 YouTube 影片 `https://youtu.be/5scD3rkMTo4` 與 Spotify 單集 `https://open.spotify.com/episode/0vbCTCbCxpRPo8njxQgmgc?si=MDkD7l4_T7mmQXe1sYShBw`，並將頁面影音區改為 YouTube iframe、Spotify iframe 與本機音訊備援播放並列。同步更新單集上架筆記與總表狀態為 `published`。

**目前狀態**
待重新建置、提交並部署到 GitHub Pages 後，線上 `euthanasia` 頁面即可直接播放 YouTube 與 Spotify。
