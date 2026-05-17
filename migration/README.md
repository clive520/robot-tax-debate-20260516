# 資料庫遷移資料

這個資料夾存放從現有靜態網站整理出來、準備匯入 Supabase 的中繼資料。

## 檔案

- `debates.seed.json`：目前四篇辯論的結構化資料，包含辯論主資料、七段內容、裁判總分與媒體連結。
- `import-content-seed.sql`：將 `debates.seed.json` 匯入 Supabase 的 SQL，需先執行 `supabase/content-schema.sql`。
- `apply-content-database.sql`：合併版 SQL，包含內容資料表 schema 與四篇辯論 seed 匯入，適合直接貼到 Supabase SQL Editor 執行。

## 產生方式

```bash
node scripts/build-content-seed.mjs
node scripts/build-content-import-sql.mjs
node scripts/build-content-migration-sql.mjs
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
5. 匯入 SQL 會依 slug 更新指定辯論，並重建這些辯論底下的段落、評分與媒體資料；不會刪除不在 seed 裡的其他辯論。
