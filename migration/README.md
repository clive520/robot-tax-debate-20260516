# 資料庫遷移資料

這個資料夾存放從現有靜態網站整理出來、準備匯入 Supabase 的中繼資料。

## 檔案

- `debates.seed.json`：目前四篇辯論的結構化資料，包含辯論主資料、七段內容、裁判總分與媒體連結。

## 產生方式

```bash
node scripts/build-content-seed.mjs
```

產生器會讀取：

- `site-data/debates.json`
- `debates/*/debate.md`
- `debates/*/index.html`
- `debates/*/publishing/episode-notes.md`

## 注意事項

1. 這份 seed 是資料庫匯入前的中繼格式，尚未直接寫入 Supabase。
2. 段落順序固定為正方申論、反方申論、正方駁論、反方駁論、反方結辯、正方結辯、裁判評分。
3. Spotify 目前統一使用節目頁 URL；未來若取得單集 URL，可新增或更新 `spotify_episode` 媒體資料。
4. YouTube、MP3、SRT 等媒體先以目前 GitHub Pages 網址作為前台可讀來源。

