# 集數上架資料

本文件用來記錄「AI 辯論所」每一集對外上架需要的資料，包括標題、說明、封面、影片檔、Podcast 音訊、字幕與上架網址。每新增一篇辯論，需新增一筆資料。

## 狀態定義

| 狀態 | 說明 |
| --- | --- |
| `draft` | 內容或素材尚未完成 |
| `ready` | 上架素材已完成，等待平台上傳 |
| `scheduled` | 已在平台排程 |
| `published` | 已公開發布 |
| `needs-fix` | 已發現問題，需要重產或修改 |

## 欄位範本

```text
## EP{集數}：{辯論題目}

- Slug：
- 狀態：
- 網站頁面：
- 預計發布時間：
- 正方：
- 反方：
- 裁判：
- YouTube 標題：
- YouTube 說明：
- YouTube 縮圖：
- YouTube 影片檔：
- YouTube 字幕檔：
- YouTube URL：
- YouTube Embed URL：
- Podcast 標題：
- Podcast 說明：
- Podcast 音訊檔：
- Podcast 封面：
- Podcast URL：
- Podcast Embed URL：
- 備註：
```

## EP001：我國應廢除死刑

- Slug：`death-penalty`
- 狀態：`scheduled`
- 網站頁面：`https://clive520.github.io/robot-tax-debate-20260516/debates/death-penalty/`
- 預計發布時間：2026-05-22 17:00（Asia/Taipei）
- 正方：Claude
- 反方：Gemini
- 裁判：Codex / OpenAI
- YouTube 標題：`AI辯論所_EP04：我國應廢除死刑`
- YouTube 說明：

```text
這裡是 AI 辯論所，讓不同 AI 角色針對公共議題進行完整辯論。

本集題目：我國應廢除死刑

正方：Claude
反方：Gemini
裁判：Codex / OpenAI

本集 Podcast 影片只收錄正方與反方辯論，不包含裁判評分。完整辯論文字、裁判評分與留言互動，請前往網站頁面：
https://clive520.github.io/robot-tax-debate-20260516/debates/death-penalty/

本集討論重點：
- 生命權與國家權力
- 司法錯誤與不可逆風險
- 被害人正義與社會安全
- 終身隔離與制度轉型

字幕：本影片使用上傳的 SRT 字幕檔，建議開啟 YouTube 字幕觀看。
```

- YouTube 縮圖：`debates/death-penalty/publishing/youtube-thumbnail.png`
- YouTube 影片檔：`debates/death-penalty/video/output/podcast-video.mp4`
- YouTube 字幕檔：`debates/death-penalty/video/output/captions.srt`
- YouTube URL：`https://youtu.be/1sd9BKkhHWQ`
- YouTube Embed URL：`https://www.youtube.com/embed/1sd9BKkhHWQ`
- Podcast 標題：`我國應廢除死刑`
- Podcast 說明：

```text
本集 AI 辯論所討論「我國應廢除死刑」。

正方 Claude 主張廢除死刑，聚焦生命權、司法錯誤與制度可補救性。
反方 Gemini 主張目前不應廢除死刑，強調被害人正義、社會安全與司法信任。

本 Podcast 只收錄正方與反方辯論，不包含裁判評分與勝負判定。完整裁判評分與文字稿請見網站：
https://clive520.github.io/robot-tax-debate-20260516/debates/death-penalty/
```

- Podcast 音訊檔：`debates/death-penalty/podcast/debate-podcast.mp3`
- Podcast 封面：`debates/death-penalty/publishing/podcast-cover.png`
- Podcast 平台：Spotify for Creators
- Podcast 狀態：已排程，2026-05-22 17:00（GMT+8）
- Podcast URL：待公開後回填
- Podcast Embed URL：待公開後回填
- 備註：本集已完成 Podcast 音訊、影片、SRT、YouTube 縮圖與 Podcast 封面。2026-05-17 已重新上傳正式 YouTube 影片，影片連結為 `https://youtu.be/1sd9BKkhHWQ`，排程於 2026-05-22 17:00（GMT+0800）公開，已加入 `AI 辯論所` 播放清單，並已上傳自訂縮圖與「中文（台灣）」SRT 字幕。先前測試影片 `https://youtu.be/x9jDcUm1r64` 可刪除。同日已在 Spotify for Creators 建立 `AI 辯論所` 節目，並將本集音訊 `debate-podcast.mp3` 排程於 2026-05-22 17:00（GMT+8）發布，清單狀態顯示 `Scheduled`。

## EP002：學校是否應全面禁止學生帶手機到學校

- Slug：`school-phone`
- 狀態：`published`
- 網站頁面：`https://clive520.github.io/robot-tax-debate-20260516/debates/school-phone/`
- 預計發布時間：直接發布
- 正方：Codex
- 反方：Gemini
- 裁判：Claude
- YouTube 標題：`AI辯論所_EP02：學校是否應全面禁止學生帶手機到學校`
- YouTube 縮圖：`debates/school-phone/publishing/youtube-thumbnail.png`
- YouTube 影片檔：`debates/school-phone/video/output/podcast-video.mp4`
- YouTube 字幕檔：`debates/school-phone/video/output/captions.srt`
- YouTube URL：`https://youtu.be/iyMHcrXCWHc`
- YouTube Embed URL：`https://www.youtube.com/embed/iyMHcrXCWHc`
- Podcast 標題：`學校是否應全面禁止學生帶手機到學校`
- Podcast 音訊檔：`debates/school-phone/podcast/debate-podcast.mp3`
- Podcast 封面：`debates/school-phone/publishing/podcast-cover.png`
- Podcast 平台：Spotify for Creators；網站保留本機音訊備援播放
- Podcast 狀態：`published`
- Podcast URL：`https://open.spotify.com/episode/0iT1XMTXzNsXTUIczrQW8q?si=6Bkr6XsERk6pKpeA60luAQ`
- Podcast Embed URL：`https://open.spotify.com/embed/episode/0iT1XMTXzNsXTUIczrQW8q?utm_source=generator`
- 備註：2026-05-17 已完成 Podcast 音訊、`captions-source.json`、YouTube 用 `captions.srt`、Podcast 影片 `podcast-video.mp4`、YouTube 縮圖與 Podcast 封面。YouTube 與 Spotify 已公開上架，網站頁已回填兩個平台的內嵌播放器，並保留網頁 Podcast 音訊作為備援播放。
