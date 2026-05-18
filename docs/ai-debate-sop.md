# AI 辯論所標準製作流程

本文件是「AI 辯論所」今後新增辯論主題時的唯一標準流程。除 `docs/work-log.md` 作為工作日誌外，新增題目、產出辯論、寫入資料庫、製作 Podcast、製作 YouTube 影片、上架與網站更新，都以本文件為準。

## 一、流程總覽

使用者提供辯論題目後，完整流程如下：

1. 確認題目、slug、集數與發布策略。
2. 分配正方、反方與裁判。
3. 產生完整辯論與裁判評分。
4. 整理文字稿與網站資料。
5. 寫入 Supabase 資料庫。
6. 產生網站逐段語音。
7. 產生 Podcast 音訊。
8. 產生 YouTube 影片與 SRT 字幕。
9. 準備 YouTube 與 Spotify 上架資料。
10. 上架或排程 YouTube / Spotify。
11. 回填媒體網址到資料庫。
12. 建置、預覽、部署網站。
13. 檢查線上頁面與互動功能。
14. 登錄工作日誌。

## 二、啟動條件

使用者至少提供：

1. 辯論題目。
2. 是否立即發布，或指定發布時間。

若使用者沒有指定，預設如下：

1. 發布節奏：每週五 17:00（Asia/Taipei）。
2. AI 角色：從候選池隨機分配。
3. 網站狀態：先建立為 `draft` 或 `scheduled`，確認完成後再發布。
4. Podcast：只收錄正方與反方辯論，不收錄裁判。
5. YouTube 影片：使用 Podcast 音訊，搭配視覺畫面與 SRT 字幕檔。

## 三、角色分配

每場辯論固定包含三種角色：

| 角色 | 任務 |
| --- | --- |
| 正方 | 支持命題，提出申論、駁論與結辯 |
| 反方 | 反對命題，提出申論、駁論與結辯 |
| 裁判 | 公平評分、判定勝負、寫出理由 |

候選 AI：

1. Codex / OpenAI
2. Gemini
3. Claude
4. xAI Grok
5. DeepSeek
6. Microsoft Copilot

分配規則：

1. 正方、反方、裁判不可重複。
2. 使用者指定角色時，以使用者指定為優先。
3. 若某個模型無法登入或無法使用，改由其他候選補位。
4. 裁判應避免與任一方立場混用，需輸出中立評分。
5. 涉及法律、醫療、重大公共政策或最新事件時，需特別標示推論與資料來源的差異。

## 四、辯論內容格式

每場辯論固定七段：

1. 正方申論：破題、定義、提出 2 到 3 個主要理由。
2. 反方申論：破題、定義、提出 2 到 3 個主要理由。
3. 正方駁論：反駁反方核心論點，補強己方證據。
4. 反方駁論：反駁正方核心論點，補強己方證據。
5. 反方結辯：反方先總結，指出正方矛盾，做最後拉票。
6. 正方結辯：正方後總結，指出反方矛盾，做最後拉票。
7. 裁判評分：多面向評分、總分、勝方、理由與改進建議。

裁判評分面向預設為：

| 面向 | 建議分數 |
| --- | --- |
| 立論清晰度 | 10 |
| 論證深度 | 15 |
| 證據與例子 | 10 |
| 反駁有效性 | 15 |
| 政策可行性 | 10 |
| 結辯說服力 | 10 |
| 整體策略 | 10 |

裁判必須輸出：

1. 正方各面向分數。
2. 反方各面向分數。
3. 總分與勝方。
4. 勝負理由。
5. 雙方最強論點。
6. 雙方最大弱點。
7. 雙方若要重賽應如何補強。

## 五、資料與檔案建立

每個新題目建立一個英文 slug，例如：

```text
death-penalty
robot-tax
school-phone
```

本機資料夾建議結構：

```text
debates/
  <slug>/
    debate.md
    podcast/
      debate-podcast.mp3
      captions-source.json
      captions.srt
      podcast-notes.md
    publishing/
      episode-notes.md
      youtube-thumbnail.png
      podcast-cover.png
    video/
      output/
        podcast-video.mp4
        captions.srt
        preview-speaker-30s.jpg
        preview-speaker-190s.jpg
        preview-speaker-470s.jpg
```

大型輸出檔如 `video/output/`、分段 TTS 暫存檔與可重產素材不納入 Git。文字稿、流程文件、腳本與必要設定才提交。

## 六、資料庫寫入

網站內容以 Supabase 為主資料來源。新增辯論時需寫入：

### `debates`

1. `slug`
2. `title`
3. `summary`
4. `category`
5. `status`
6. `publish_at`
7. `affirmative_model`
8. `negative_model`
9. `judge_model`
10. `winner_label`
11. `affirmative_score`
12. `negative_score`
13. `score_total`
14. `source_markdown_url`

### `debate_segments`

每段辯論一筆：

1. `round_key`
2. `speaker_role`
3. `speaker_name`
4. `title`
5. `content`
6. `sort_order`
7. `audio_url`

建議 `round_key`：

1. `affirmative_opening`
2. `negative_opening`
3. `affirmative_rebuttal`
4. `negative_rebuttal`
5. `negative_closing`
6. `affirmative_closing`
7. `judge_decision`

### `debate_scorecards`

寫入裁判各面向評分、正反方分數與裁判說明。

### `debate_media`

至少建立或更新：

1. `youtube`
2. `spotify_show`
3. `spotify_episode`，若有單集網址才填。
4. `mp3`
5. `srt`
6. `cover`

Podcast 呈現規則：

1. 網站固定放 Spotify 節目頁連結：`https://open.spotify.com/show/033i8synWg22dgCqwNGCAX`
2. 不嵌入 Spotify 單集播放器，避免排程單集尚未產生網址。
3. Spotify 單集 URL 可公開後補記，但不是網站必要欄位。
4. 若有 MP3，網站保留本機或線上 MP3 播放作備援。

YouTube 呈現規則：

1. 有 YouTube URL 時，轉成 embed URL 寫入資料庫。
2. 尚未上架時顯示製作中或待發布。

## 七、語音與 Podcast

網站版語音：

1. 正方、反方、裁判使用不同聲音。
2. 每段辯論可在網頁中獨立播放。
3. 語音需清楚標示角色與段落。

Podcast 版：

1. 只包含正方與反方六段辯論。
2. 不包含裁判評分、勝負判定、留言或網站管理資訊。
3. 可加入簡短開場與結尾，引導聽眾到網站閱讀完整裁判評分。

Podcast 預設產出流程：

```powershell
python scripts/build-synced-podcast.py <slug>
```

此流程需產生：

1. `debates/<slug>/podcast/debate-podcast.mp3`
2. `debates/<slug>/podcast/captions-source.json`
3. `debates/<slug>/podcast/captions.srt`
4. `debates/<slug>/video/output/captions.srt`

字幕與音訊規則：

1. 字幕以自然文句段落為主，不硬性限制 15 字。
2. 若句子過長，依逗號、頓號、分號、冒號等自然語氣點拆分。
3. 時間軸由每段 TTS 音訊實際長度累積產生。
4. 避免用全文字數比例推估字幕時間。
5. 若分段 TTS 尾端停頓明顯，可使用固定尾端裁切，預設最多約 `0.45` 秒。

## 八、YouTube 影片

影片使用 Podcast 音訊為基礎。

產出流程：

```powershell
python scripts/create-podcast-video.py <slug>
```

影片規格：

1. 16:9。
2. 1280 x 720。
3. 不燒逐字字幕。
4. 底部保留乾淨字幕安全區，供 YouTube SRT 顯示。
5. 畫面需包含辯論題目、進度列、段落重點、視覺提示與 AI 主持人。
6. 人像下方需顯示發言狀態，包含 AI 名稱與段落，例如 `Claude / 正方申論`。
7. 發言狀態牌上緣應與左側重點文字框上緣對齊。
8. 右側人像與狀態牌不得壓到底部字幕安全區。

需輸出：

1. `debates/<slug>/video/output/podcast-video.mp4`
2. `debates/<slug>/video/output/captions.srt`
3. 至少三張預覽圖，涵蓋正方、反方與結辯段落。

驗證標準：

1. MP3 可完整播放。
2. MP4 長度接近 MP3 長度。
3. SRT 最後時間接近音訊總長度。
4. 抽查中段字幕與聲音同步。
5. 預覽圖底部字幕安全區乾淨。
6. 發言狀態牌正確顯示 AI 名稱與段落。

## 九、上架資料準備

每集需準備並記錄：

1. 集數。
2. slug。
3. 狀態：`draft`、`ready`、`scheduled`、`published`、`needs-fix`。
4. 網站頁面。
5. 預計發布時間。
6. 正方、反方、裁判。
7. YouTube 標題。
8. YouTube 說明。
9. YouTube 縮圖。
10. YouTube 影片檔。
11. YouTube 字幕檔。
12. YouTube URL。
13. YouTube Embed URL。
14. Podcast 標題。
15. Podcast 說明。
16. Podcast 音訊檔。
17. Podcast 封面。
18. Spotify 節目頁 URL。
19. Spotify 單集 URL，公開後才補。
20. 備註。

YouTube 標題建議：

```text
AI辯論所_EP{集數}：{辯論題目}
```

Podcast 標題建議：

```text
{辯論題目}
```

YouTube 說明需包含：

1. 節目一句話介紹。
2. 本集題目。
3. 正方、反方、裁判。
4. 本集重點。
5. 字幕說明。
6. 網站完整辯論頁。

Podcast 說明需包含：

1. 本集題目。
2. 正方與反方角色。
3. 說明 Podcast 只收錄正反方辯論。
4. 引導聽眾到網站閱讀裁判評分與留言。

## 十、YouTube 與 Spotify 上架

目前採半自動上架：

1. Codex 準備完整上架包。
2. 使用者登入 YouTube Studio 與 Spotify for Creators。
3. Codex 使用 Chrome 協助上傳與填寫資料。
4. 使用者在平台端做最後確認與發布。
5. Codex 回填網址與狀態。

YouTube 上架：

1. 上傳 `podcast-video.mp4`。
2. 填入標題與說明。
3. 上傳 YouTube 縮圖。
4. 加入「AI 辯論所」播放清單或 Podcast 播放清單。
5. 設定語言為中文或繁體中文。
6. 上傳 `captions.srt`。
7. 檢查預覽、字幕、標題、說明與封面。
8. 由使用者確認發布或排程。
9. 回填 YouTube URL 與 embed URL。

Spotify 上架：

1. 在 Spotify for Creators 新增單集。
2. 上傳 `debate-podcast.mp3`。
3. 填入 Podcast 標題與說明。
4. 上傳封面，若平台支援。
5. 設定發布日期或排程。
6. 由使用者確認發布。
7. 網站維持使用 Spotify 節目頁連結。
8. 單集 URL 公開後可補記。

## 十一、網站更新與部署

網站更新項目：

1. Supabase 中的辯論主資料。
2. Supabase 中的段落、評分與媒體資料。
3. YouTube embed URL。
4. Spotify 節目頁連結。
5. MP3 / SRT / 封面資料。
6. 發布狀態與發布時間。

建置：

```powershell
node scripts/build-site.mjs
```

驗證：

1. 首頁是否顯示已發布且到發布時間的辯論。
2. 未發布文章是否不出現在正式首頁。
3. 單篇頁是否能載入資料庫內容。
4. YouTube 播放器是否正常。
5. Podcast MP3 或 Spotify 節目頁連結是否正常。
6. Google 登入是否正常。
7. 整篇按讚是否正常。
8. 每段認同是否正常。
9. 留言與管理員刪留言是否正常。
10. 桌面與手機寬度下沒有文字或播放器溢出。

部署：

1. Commit 本次變更。
2. Push 到 GitHub。
3. 等待 GitHub Pages 更新。
4. 開啟線上網址檢查。

## 十二、後台管理

後台應能處理：

1. 辯論列表：草稿、排程、已發布、封存。
2. 新增辯論。
3. 編輯標題、摘要、分類、角色、裁判、勝方與分數。
4. 編輯發布狀態與發布時間。
5. 編輯每段辯論內容與語音 URL。
6. 編輯 YouTube、Spotify、MP3、SRT、封面等媒體資料。
7. 查看點閱、整篇按讚、留言與段落認同。
8. 管理留言。

若後台功能尚未完成，可暫時由 Codex 直接操作 Supabase 或程式碼，但最後仍需回到後台可維護的方向。

## 十三、工作日誌

每次變更都必須登錄到：

```text
docs/work-log.md
```

工作日誌記錄：

1. 做了什麼。
2. 修改哪些檔案或資料。
3. 驗證結果。
4. 是否已提交與部署。
5. 後續事項。

工作日誌不取代本 SOP；本 SOP 是工作標準，工作日誌是歷史紀錄。

## 十四、完成定義

一集辯論完成，必須符合：

1. 文字稿完整。
2. 裁判評分完整。
3. Supabase 資料完整。
4. 網站頁面可讀。
5. 正方、反方、裁判標示清楚。
6. 網站語音可播放。
7. Podcast MP3 完成。
8. YouTube 影片完成。
9. SRT 字幕完成。
10. YouTube / Spotify 上架或排程完成，或明確標示待上架。
11. 網站媒體區已更新。
12. 首頁狀態正確。
13. 登入、按讚、認同、留言可用。
14. 本機建置通過。
15. 線上 GitHub Pages 可開啟。
16. `docs/work-log.md` 已登錄。

## 十五、舊文件定位

以下文件保留作歷史參考，但實際工作以本文件為準：

1. `docs/debate-workflow.md`
2. `docs/publishing-workflow.md`
3. `docs/episode-publishing.md`
4. `docs/database-plan.md`
5. `docs/migration-plan.md`
6. `docs/publishing-schedule.md`
