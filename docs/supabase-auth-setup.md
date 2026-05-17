# Supabase Google 登入與互動功能設定

本網站的互動功能採用：

```text
GitHub Pages 前端
Supabase Auth Google 登入
Supabase Database 儲存按讚與留言
```

## 一、目前第一版功能

已規劃並接上前端的功能：

1. 使用 Google 登入。
2. 每篇辯論可按讚或取消讚。
3. 每篇辯論可留言。
4. 留言顯示使用者名稱與時間。
5. 管理者可以刪除留言。
6. 每篇辯論顯示今日點閱與累積點閱。
7. 正反方每個發言段落可獨立按「認同」。

## 二、建立 Supabase 專案

1. 到 Supabase 建立新專案。
2. 進入 SQL Editor。
3. 執行本 repo 的 SQL：

```text
supabase/schema.sql
```

這會建立：

| 資料表 | 用途 |
| --- | --- |
| `profiles` | 儲存使用者公開名稱、頭像與管理者狀態 |
| `debate_likes` | 儲存每篇辯論的按讚紀錄 |
| `debate_comments` | 儲存每篇辯論的留言 |
| `debate_daily_views` | 儲存每篇辯論每日點閱量 |
| `debate_segment_likes` | 儲存每篇辯論各發言段落的認同數 |

SQL 也會開啟 Row Level Security，確保：

1. 未登入者可以讀取留言、讚數、段落認同數與點閱量。
2. 登入者只能用自己的帳號按讚、段落認同與留言。
3. 只有 `profiles.is_admin = true` 的管理者可以刪除留言。
4. 點閱量透過 `increment_debate_daily_view()` 函式累加，前端不直接更新資料表。

## 三、設定 Google 登入

1. 在 Supabase Dashboard 開啟 Authentication。
2. 進入 Providers。
3. 啟用 Google。
4. 到 Google Cloud Console 建立 OAuth Client。
5. 在 Google OAuth 設定中加入 Supabase 提供的 callback URL，格式通常是：

```text
https://<project-ref>.supabase.co/auth/v1/callback
```

6. 把 Google 的 Client ID 與 Client Secret 填回 Supabase Google Provider。

## 四、設定網站網址

在 Supabase Authentication 的 URL Configuration 中設定：

```text
Site URL:
https://clive520.github.io/robot-tax-debate-20260516/
```

Redirect URLs 建議加入：

```text
https://clive520.github.io/robot-tax-debate-20260516/**
http://127.0.0.1:8016/**
http://localhost:8016/**
```

本機網址只用於測試，正式部署時主要使用 GitHub Pages 網址。

## 五、填入前端設定

在 `supabase-config.js` 填入 Supabase 專案的 Project URL 與前端公開 key。

Supabase 新版介面可能會顯示為 `Publishable key`；舊版文件常稱為 `anon public key`。兩者用途都是放在前端瀏覽器中，搭配 RLS 規則控制資料權限。

```js
window.DEBATE_SUPABASE_CONFIG = {
  url: "https://YOUR_PROJECT_REF.supabase.co",
  anonKey: "YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY"
};
```

`anonKey` 欄位放的是前端公開 key，不是 secret key 或 service role key。不要把 secret key / service role key 放進網站。

## 六、設定管理者

管理者刪留言不是靠前端判斷，而是靠 Supabase RLS 權限。

第一位管理者登入一次網站後，到 Supabase SQL Editor 執行：

```sql
select id, display_name, is_admin
from public.profiles
order by created_at desc;
```

找到你的使用者 `id`，再執行：

```sql
update public.profiles
set is_admin = true
where id = '你的使用者 id';
```

之後你重新整理網站，就會看到留言旁邊出現「刪除」按鈕。

## 七、目前接入的頁面

第一版互動功能已接在：

1. `debates/robot-tax/`
2. `debates/euthanasia/`
3. `debates/school-phone/`

未來新增辯論頁時，只要加入相同的 `engagement` 區塊，並設定獨立的 `data-debate-id` 即可。
