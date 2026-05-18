# AI 辯論所資料庫規劃

> 本文件保留作資料庫設計參考。實際新增辯論、寫入資料庫與媒體回填流程，請以 `docs/ai-debate-sop.md` 為標準流程。

本文件規劃 AI 辯論所從靜態檔案網站，轉向以 Supabase 作為主要內容資料庫的資料結構。目標是讓辯論內容、影音連結、發布時間、讀者互動與管理者操作都能集中維護。

## 設計目標

1. 辯論內容由資料庫管理，不再需要每一篇手動維護獨立 HTML。
2. 首頁依照資料庫中的 `status` 與 `publish_at` 自動決定是否顯示。
3. YouTube、Spotify、MP3、SRT、封面等媒體資料集中存放。
4. Spotify 單集網址尚未產生時，可以先顯示 MP3；產生後只要補上網址即可切換呈現。
5. Google 登入、管理者權限、留言管理、按讚、點閱、訂閱數都由 Supabase 控制。
6. 舊有 Markdown、音檔、影片檔仍可作為備份與產製來源，不必一次刪除。

## 核心資料表

### `profiles`

儲存登入者基本資料與站內權限。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid | 對應 `auth.users.id` |
| `display_name` | text | 顯示名稱 |
| `avatar_url` | text | 頭像 |
| `email` | text | Email |
| `role` | text | `reader`、`admin`、`owner` |
| `created_at` | timestamptz | 建立時間 |
| `updated_at` | timestamptz | 更新時間 |

權限建議：

- `reader`：一般登入讀者，可留言、按讚、訂閱。
- `admin`：可管理辯論資料、影音連結、留言。
- `owner`：站主，可管理管理員。

### `debates`

辯論文章主表，負責首頁列表、發布狀態、角色與裁判結果。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid | 主鍵 |
| `slug` | text | 網址識別，例如 `death-penalty` |
| `title` | text | 辯論題目 |
| `summary` | text | 首頁摘要 |
| `category` | text | 分類 |
| `status` | text | `draft`、`scheduled`、`published`、`archived` |
| `publish_at` | timestamptz | 預定發布時間 |
| `cover_image_url` | text | 首頁或文章封面 |
| `affirmative_model` | text | 正方代表 |
| `negative_model` | text | 反方代表 |
| `judge_model` | text | 裁判 |
| `winner` | text | `affirmative`、`negative`、`tie` |
| `affirmative_score` | integer | 正方總分 |
| `negative_score` | integer | 反方總分 |
| `judge_summary` | text | 裁判摘要 |
| `source_markdown_url` | text | Markdown 備份網址或路徑 |
| `created_at` | timestamptz | 建立時間 |
| `updated_at` | timestamptz | 更新時間 |

前台顯示條件：

```sql
status = 'published'
and publish_at <= now()
```

### `debate_segments`

儲存辯論逐字內容。每一段都可以獨立按讚、獨立掛語音檔。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid | 主鍵 |
| `debate_id` | uuid | 對應 `debates.id` |
| `round_key` | text | 段落類型 |
| `speaker_role` | text | `affirmative`、`negative`、`judge` |
| `speaker_name` | text | 實際說話者，例如 Codex、Gemini |
| `title` | text | 段落標題，例如「正方申論」 |
| `content` | text | 段落全文 |
| `sort_order` | integer | 顯示順序 |
| `audio_url` | text | 該段語音檔 |
| `created_at` | timestamptz | 建立時間 |
| `updated_at` | timestamptz | 更新時間 |

建議 `round_key`：

- `affirmative_opening`
- `negative_opening`
- `affirmative_rebuttal`
- `negative_rebuttal`
- `negative_closing`
- `affirmative_closing`
- `judge_decision`

### `debate_scorecards`

儲存裁判分項評分，避免只留下總分。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid | 主鍵 |
| `debate_id` | uuid | 對應辯論 |
| `criterion` | text | 評分面向 |
| `affirmative_score` | numeric | 正方分數 |
| `negative_score` | numeric | 反方分數 |
| `comment` | text | 裁判說明 |
| `sort_order` | integer | 顯示順序 |

### `debate_media`

所有影音、Podcast、字幕、封面集中管理。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid | 主鍵 |
| `debate_id` | uuid | 對應辯論 |
| `media_type` | text | 媒體類型 |
| `title` | text | 媒體標題 |
| `url` | text | 原始網址 |
| `embed_url` | text | iframe 或播放器用網址 |
| `status` | text | `pending`、`available`、`hidden` |
| `published_at` | timestamptz | 平台發布時間 |
| `created_at` | timestamptz | 建立時間 |
| `updated_at` | timestamptz | 更新時間 |

建議 `media_type`：

- `youtube`
- `spotify_episode`
- `spotify_show`
- `mp3`
- `video_file`
- `srt`
- `cover`

Podcast 呈現規則：

1. 有 `spotify_episode` 且 `status = available`：顯示 Spotify 單集。
2. 沒有 Spotify 單集但有 `mp3`：顯示 MP3 播放器。
3. 兩者都沒有：顯示「Podcast 製作中」。

YouTube 呈現規則：

1. 有 `youtube` 且 `status = available`：顯示 YouTube iframe。
2. 沒有 YouTube：顯示「影片製作中」。

### `debate_daily_views`

儲存每日點閱數。可沿用目前已有表格，但建議未來將 `debate_id` 從 text 改為 uuid，或新增 uuid 欄位逐步遷移。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `debate_id` | uuid | 對應辯論 |
| `view_date` | date | 日期 |
| `view_count` | integer | 當日點閱 |
| `updated_at` | timestamptz | 更新時間 |

### `debate_segment_likes`

儲存每一段辯論的認同數。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `debate_id` | uuid | 對應辯論 |
| `segment_id` | uuid | 對應段落 |
| `user_id` | uuid | 對應使用者 |
| `created_at` | timestamptz | 按讚時間 |

限制：

- 同一個使用者對同一段只能按一次。
- 使用者可以取消按讚。

### `debate_likes`

儲存整篇辯論的按讚。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `debate_id` | uuid | 對應辯論 |
| `user_id` | uuid | 對應使用者 |
| `created_at` | timestamptz | 按讚時間 |

### `debate_comments`

儲存留言與管理者刪除紀錄。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | bigint | 主鍵 |
| `debate_id` | uuid | 對應辯論 |
| `user_id` | uuid | 留言者 |
| `content` | text | 留言內容 |
| `created_at` | timestamptz | 留言時間 |
| `updated_at` | timestamptz | 更新時間 |
| `deleted_at` | timestamptz | 刪除時間 |
| `deleted_by` | uuid | 刪除者 |

建議採用軟刪除，不直接刪除資料。

### `site_subscriptions`

站內訂閱表，用來呈現可控的訂閱數。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | uuid | 主鍵 |
| `user_id` | uuid | 訂閱者 |
| `status` | text | `active`、`cancelled` |
| `subscribed_at` | timestamptz | 訂閱時間 |
| `cancelled_at` | timestamptz | 取消時間 |

說明：Spotify 不適合作為網站訂閱數來源，因為 Spotify 節目頁不保證提供可穩定讀取或嵌入的訂閱數。網站應以站內訂閱作為正式數據。

### `admin_audit_logs`

記錄管理者後台操作，方便追蹤內容變更。

| 欄位 | 型別 | 說明 |
| --- | --- | --- |
| `id` | bigint | 主鍵 |
| `actor_id` | uuid | 操作者 |
| `action` | text | 操作類型 |
| `entity_type` | text | 影響資料類型 |
| `entity_id` | text | 影響資料 ID |
| `metadata` | jsonb | 變更細節 |
| `created_at` | timestamptz | 操作時間 |

## 管理後台功能

第一階段後台只做必要功能：

1. 辯論列表：草稿、排程、已發布、封存。
2. 編輯辯論：標題、摘要、角色、裁判、發布時間、狀態。
3. 編輯段落：每段文字、順序、說話者、音檔。
4. 編輯影音：YouTube、Spotify 單集、Spotify 節目頁、MP3、SRT。
5. 留言管理：隱藏或刪除不適當留言。

第二階段再加入：

1. 圖表化點閱統計。
2. 段落認同排名。
3. 訂閱者數與新集通知。
4. AI 生成流程狀態追蹤。

## RLS 權限原則

前台讀者：

- 可讀取已發布且到達發布時間的辯論。
- 可讀取已發布辯論的段落、評分、媒體。
- 登入後可留言、按讚、訂閱。
- 只能修改或刪除自己的按讚與訂閱。

管理者：

- 可讀取所有草稿、排程、已發布資料。
- 可新增與修改辯論、段落、媒體、發布時間。
- 可軟刪留言。

站主：

- 可調整使用者角色。
- 可管理管理者權限。

## 建議實作順序

1. 先新增新表，不移除舊表。
2. 寫入目前四篇辯論的資料。
3. 首頁改成從 Supabase 讀取 `debates`。
4. 新增單一動態辯論頁，用 `slug` 載入資料。
5. 後台先做最小可用版本。
6. 驗證穩定後，再逐步移除舊的每篇獨立 HTML。
