# AI 辯論所上架流程

本文件定義「AI 辯論所」每一集 Podcast 與 YouTube 影片的上架流程。目標是讓 Codex 可以協助準備素材、填寫上架資料、操作瀏覽器上傳，並把最後網址回填到集數資料表。

## 一、上架模式

目前採用「半自動上架」：

1. Codex 在本機產出完整上架包。
2. 使用者登入 YouTube Studio 與 Podcast 平台。
3. Codex 使用 Chrome 協助上傳、填寫標題、說明、封面、字幕與分類。
4. 使用者在平台端做最後確認與發布。
5. Codex 回填影片網址、Podcast 網址與上架狀態。

等流程穩定後，再評估是否改為 API 或 RSS 自動化。

## 二、每集上架包

每一集上架前，應確認下列素材已存在：

```text
debates/
  topic-slug/
    podcast/
      debate-podcast.mp3
      captions-source.json
      captions.srt
      podcast-notes.md
    video/
      output/
        podcast-video.mp4
        captions.srt
        preview-speaker-30s.jpg
        preview-speaker-190s.jpg
        preview-speaker-470s.jpg
```

若有另外製作封面，建議放在：

```text
debates/
  topic-slug/
    publishing/
      youtube-thumbnail.png
      podcast-cover.png
      episode-notes.md
```

## 三、YouTube 上架流程

1. 開啟 YouTube Studio。
2. 上傳 `video/output/podcast-video.mp4`。
3. 填入 `docs/episode-publishing.md` 中該集的 YouTube 標題。
4. 填入 YouTube 說明文字。
5. 上傳 YouTube 縮圖。
6. 將影片加入「AI 辯論所」相關播放清單或 Podcast 播放清單。
7. 設定語言為繁體中文或中文。
8. 上傳 `video/output/captions.srt` 作為字幕。
9. 檢查影片預覽、字幕、標題、說明與封面。
10. 由使用者確認發布或排程。
11. 發布後回填 YouTube URL。

YouTube 官方縮圖規格目前建議使用 16:9，解析度盡量高，桌面上傳縮圖大小限制為 50MB；Podcast 播放清單則建議 1:1 縮圖。參考：<https://support.google.com/youtube/answer/72431>

## 四、Podcast 上架流程

Podcast 平台以 Spotify for Creators 或其他支援 RSS 的主機為主。初期先用平台後台手動上傳，之後再評估 RSS 自動化。

1. 開啟 Podcast 平台後台。
2. 新增單集。
3. 上傳 `podcast/debate-podcast.mp3`。
4. 填入 Podcast 標題。
5. 填入 Podcast 說明文字。
6. 上傳單集封面，若平台支援。
7. 設定發布日期或排程。
8. 預覽單集頁面。
9. 由使用者確認發布。
10. 發布後回填 Podcast URL。

Spotify 官方說明：若節目由 Spotify 託管，可以在設定中更新節目封面，也可在單集頁面更新 episode cover art；部分平台不一定顯示單集封面。參考：<https://support.spotify.com/us/creators/article/uploading-cover-art/>

Apple Podcasts 通常透過 RSS feed 提交節目，而不是每集直接在 Apple 後台上傳 MP3。若未來要上架 Apple Podcasts，應先決定 Podcast hosting 與 RSS feed。參考：<https://podcasters.apple.com/support/897-submit-a-show>

## 五、標題格式

YouTube 影片標題建議：

```text
{辯論題目}｜AI 辯論所
```

Podcast 單集標題建議：

```text
{辯論題目}
```

若需要系列感，也可以改為：

```text
AI 辯論所 EP{集數}：{辯論題目}
```

## 六、說明文字格式

YouTube 說明文字建議包含：

1. 一句節目介紹。
2. 本集辯論題目。
3. 正方、反方、裁判。
4. 本集重點。
5. 字幕說明。
6. 網站完整辯論頁連結。
7. 頻道簡介。

Podcast 說明文字建議包含：

1. 本集辯論題目。
2. 正方與反方角色。
3. 本集只收錄正反方辯論，不包含裁判評分。
4. 引導聽眾到網站閱讀裁判評分與留言。

## 七、封面規格

YouTube 影片縮圖：

1. 16:9。
2. 建議 3840 x 2160 或至少 1280 x 720。
3. 保持文字少而清楚。
4. 顯示題目核心關鍵字與「AI 辯論所」。

YouTube Podcast 播放清單或 Podcast 平台封面：

1. 1:1。
2. 以節目品牌「AI 辯論所」為主。
3. 單集若需要獨立封面，保留一致版型，只更換題目關鍵字與主視覺。

## 八、回填規則

每次上架後，必須更新：

1. `docs/episode-publishing.md`
2. 該集 `debates/<slug>/podcast/podcast-notes.md`
3. `docs/work-log.md`

若 YouTube 或 Podcast 平台尚未發布，只填「待上架」或「已排程」，不要填推測網址。

