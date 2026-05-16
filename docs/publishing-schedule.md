# 預約發布制度

本網站採用「真正預約發布」策略：未到發布時間的辯論頁，不會被放進 GitHub Pages 的正式部署 artifact，因此讀者無法透過正式網站網址提前開啟該篇辯論。

## 一、發布節奏

固定出刊時間：

```text
每週五 17:00（Asia/Taipei）
```

GitHub Actions 使用 UTC 排程，因此對應為：

```text
每週五 09:00 UTC
```

## 二、核心原則

1. `debates/` 放已公開或立即公開的辯論頁。
2. `drafts/debates/` 放尚未公開的辯論頁草稿。
3. `site-data/debates.json` 是發布排程與首頁清單的資料來源。
4. GitHub Pages 不再直接部署整個 repo 根目錄，而是部署 `dist/`。
5. `dist/` 由 `scripts/build-site.mjs` 產生，只包含已到發布時間的內容。

## 三、資料格式

每篇辯論在 `site-data/debates.json` 中建立一筆 metadata：

```json
{
  "id": "future-topic",
  "slug": "future-topic",
  "sourceDir": "drafts/debates/future-topic",
  "status": "scheduled",
  "publishAt": "2026-05-22T17:00:00+08:00",
  "dateLabel": "2026-05-22",
  "category": "公共政策",
  "title": "辯論題目",
  "summary": "首頁摘要",
  "winner": "正方勝",
  "affirmative": "Codex",
  "negative": "Gemini",
  "judge": "Claude",
  "affirmativeScore": "60",
  "negativeScore": "55",
  "scoreTotal": "80",
  "coverClass": ""
}
```

`status` 可用值：

| 狀態 | 說明 |
| --- | --- |
| `draft` | 永遠不發布，只作為草稿 |
| `scheduled` | 到 `publishAt` 後才發布 |
| `published` | 立即發布 |

## 四、建置邏輯

`scripts/build-site.mjs` 會：

1. 清空並重建 `dist/`。
2. 複製首頁、樣式、互動腳本與 Supabase 設定。
3. 讀取 `site-data/debates.json`。
4. 篩選 `published` 或已到 `publishAt` 的 `scheduled` 議題。
5. 只把符合條件的辯論資料夾複製到 `dist/debates/`。
6. 產生公開版 `dist/debates.json`，供首頁載入。
7. 加入 `.nojekyll`。

## 五、重要限制

若 GitHub repository 是 public，放在 `drafts/` 裡的草稿雖然不會出現在 GitHub Pages 網站，但仍可能被懂得看 GitHub 原始碼的人看到。

若需要真正保密，草稿應放在：

1. 私有 repository。
2. 私有雲端資料夾。
3. Supabase Storage 私有 bucket。
4. 本機工作資料夾，等發布前才 commit。

目前策略是「正式網站不提前發布」，不是「public repository 來源碼完全保密」。

## 六、操作流程

新增預約辯論時：

1. 在 `drafts/debates/<slug>/` 建立完整辯論頁。
2. 在 `site-data/debates.json` 新增 metadata。
3. 設定 `status` 為 `scheduled`。
4. 設定 `publishAt`，例如 `2026-05-22T17:00:00+08:00`。
5. 本機執行：

```bash
node scripts/build-site.mjs
```

6. 檢查 `dist/` 是否只包含應公開的議題。
7. commit / push。
8. GitHub Actions 會在每週五 17:00 台灣時間重建並部署。
