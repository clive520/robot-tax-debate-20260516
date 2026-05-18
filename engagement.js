const roots = document.querySelectorAll("[data-engagement-root]");
const config = window.DEBATE_SUPABASE_CONFIG || {};
const storageKey = "ai_debate_supabase_session";
const isConfigured = Boolean(config.url) && Boolean(config.anonKey);

function readSession() {
  try {
    const session = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (!session?.access_token) return null;
    if (session.expires_at && Number(session.expires_at) * 1000 <= Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

function authRedirectTo() {
  return `${window.location.origin}${window.location.pathname}${window.location.search}`;
}

function oauthUrl() {
  const url = new URL(`${config.url}/auth/v1/authorize`);
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_to", authRedirectTo());
  return url.toString();
}

async function rest(path, session, options = {}) {
  const headers = {
    apikey: config.anonKey,
    Authorization: `Bearer ${session?.access_token || config.anonKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
    ...(options.headers || {}),
  };
  const response = await fetch(`${config.url}${path}`, { ...options, headers });
  if (!response.ok) throw new Error(await response.text());
  if (response.status === 204) return null;
  return response.json();
}

async function currentUser(session) {
  if (!session) return null;
  return rest("/auth/v1/user", session);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function renderDisabled(root) {
  root.innerHTML = `
    <article class="engagement-card">
      <div>
        <p class="eyebrow">Community</p>
        <h3>互動功能尚未啟用</h3>
        <p>完成 Supabase 專案設定後，這裡會出現 Google 登入、按讚與留言功能。</p>
      </div>
    </article>
  `;
}

function renderShell(root) {
  root.innerHTML = `
    <article class="engagement-card">
      <div class="engagement-toolbar">
        <div>
          <p class="eyebrow">Community</p>
          <h3>讀者互動</h3>
          <p data-auth-label>正在確認登入狀態...</p>
        </div>
        <div class="auth-actions">
          <button type="button" class="button-main" data-login>使用 Google 登入</button>
          <button type="button" data-logout hidden>登出</button>
        </div>
      </div>

      <div class="view-row" aria-label="點閱統計">
        <span>今日點閱 <strong data-view-today>--</strong></span>
        <span>累積點閱 <strong data-view-total>--</strong></span>
      </div>

      <div class="like-row">
        <button type="button" data-like disabled>按讚</button>
        <span data-like-count>0 個讚</span>
      </div>

      <form class="comment-form" data-comment-form>
        <label for="comment-body-${root.dataset.debateId}">留言</label>
        <textarea id="comment-body-${root.dataset.debateId}" data-comment-body rows="4" maxlength="1000" placeholder="登入後可以留下你的看法。" disabled></textarea>
        <div class="comment-form-actions">
          <span data-comment-status></span>
          <button type="submit" disabled>送出留言</button>
        </div>
      </form>

      <div class="comment-list" data-comment-list aria-live="polite"></div>
    </article>
  `;
}

async function initEngagement(root) {
  const debateId = root.dataset.debateId;
  const loginButton = root.querySelector("[data-login]");
  const logoutButton = root.querySelector("[data-logout]");
  const authLabel = root.querySelector("[data-auth-label]");
  const viewToday = root.querySelector("[data-view-today]");
  const viewTotal = root.querySelector("[data-view-total]");
  const likeButton = root.querySelector("[data-like]");
  const likeCount = root.querySelector("[data-like-count]");
  const form = root.querySelector("[data-comment-form]");
  const textarea = root.querySelector("[data-comment-body]");
  const submitButton = form.querySelector("button[type='submit']");
  const status = root.querySelector("[data-comment-status]");
  const list = root.querySelector("[data-comment-list]");

  let session = readSession();
  let user = await currentUser(session).catch(() => null);
  if (!user) session = null;
  let profile = null;
  let liked = false;

  function setStatus(message) {
    status.textContent = message || "";
  }

  async function loadProfile() {
    profile = null;
    if (!user) return;
    const rows = await rest(`/rest/v1/profiles?select=display_name,avatar_url,is_admin&id=eq.${encodeURIComponent(user.id)}`, session).catch(() => []);
    profile = rows?.[0] || null;
  }

  function setAuthUi() {
    const isSignedIn = Boolean(session && user);
    loginButton.hidden = isSignedIn;
    logoutButton.hidden = !isSignedIn;
    likeButton.disabled = !isSignedIn;
    textarea.disabled = !isSignedIn;
    submitButton.disabled = !isSignedIn;
    textarea.placeholder = isSignedIn ? "留下你的看法，最多 1000 字。" : "登入後可以留下你的看法。";

    if (!isSignedIn) {
      authLabel.textContent = "登入後可以按讚與留言。未登入仍可閱讀留言。";
      likeButton.textContent = "登入後按讚";
      return;
    }

    const displayName =
      profile?.display_name ||
      user.user_metadata?.full_name ||
      user.email ||
      "已登入使用者";
    authLabel.textContent = `目前登入：${displayName}${profile?.is_admin ? "（管理者）" : ""}`;
    likeButton.textContent = liked ? "已按讚" : "按讚";
  }

  async function loadLikes() {
    const rows = await rest(`/rest/v1/debate_likes?select=user_id&debate_id=eq.${encodeURIComponent(debateId)}`, null).catch(() => []);
    likeCount.textContent = `${rows.length || 0} 個讚`;
    liked = Boolean(user && rows.some((row) => row.user_id === user.id));
    setAuthUi();
  }

  async function recordView() {
    try {
      const rows = await rest("/rest/v1/rpc/increment_debate_daily_view", null, {
        method: "POST",
        body: JSON.stringify({ input_debate_id: debateId }),
      });
      const row = Array.isArray(rows) ? rows[0] : rows;
      viewToday.textContent = String(row?.today_count ?? 0);
      viewTotal.textContent = String(row?.total_count ?? 0);
    } catch {
      viewToday.textContent = "尚未啟用";
      viewTotal.textContent = "尚未啟用";
    }
  }

  function renderEmptyComments() {
    list.innerHTML = `<p class="empty-comments">目前還沒有留言。</p>`;
  }

  function appendComment(comment) {
    const item = document.createElement("article");
    item.className = "comment-item";

    const meta = document.createElement("div");
    meta.className = "comment-meta";

    const author = document.createElement("strong");
    author.textContent = comment.profiles?.display_name || "訪客";

    const time = document.createElement("time");
    time.dateTime = comment.created_at;
    time.textContent = formatDate(comment.created_at);

    meta.append(author, time);

    const body = document.createElement("p");
    body.textContent = comment.body;
    item.append(meta, body);

    if (profile?.is_admin) {
      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "comment-delete";
      deleteButton.textContent = "刪除";
      deleteButton.addEventListener("click", async () => {
        deleteButton.disabled = true;
        try {
          await rest(`/rest/v1/debate_comments?id=eq.${encodeURIComponent(comment.id)}`, session, { method: "DELETE" });
          setStatus("留言已刪除。");
          await loadComments();
        } catch {
          deleteButton.disabled = false;
          setStatus("刪除失敗，請稍後再試。");
        }
      });
      item.append(deleteButton);
    }

    list.appendChild(item);
  }

  async function loadComments() {
    const path = `/rest/v1/debate_comments?select=id,body,created_at,user_id,profiles(display_name,avatar_url)&debate_id=eq.${encodeURIComponent(debateId)}&order=created_at.desc&limit=50`;
    const rows = await rest(path, null).catch(() => null);
    list.innerHTML = "";
    if (!rows) {
      list.innerHTML = `<p class="empty-comments">留言暫時無法載入。</p>`;
      return;
    }
    if (!rows.length) {
      renderEmptyComments();
      return;
    }
    rows.forEach(appendComment);
  }

  loginButton.addEventListener("click", () => {
    window.location.href = oauthUrl();
  });

  logoutButton.addEventListener("click", () => {
    localStorage.removeItem(storageKey);
    session = null;
    user = null;
    profile = null;
    liked = false;
    setAuthUi();
  });

  likeButton.addEventListener("click", async () => {
    if (!session || !user) return;
    likeButton.disabled = true;
    try {
      if (liked) {
        await rest(`/rest/v1/debate_likes?debate_id=eq.${encodeURIComponent(debateId)}&user_id=eq.${encodeURIComponent(user.id)}`, session, { method: "DELETE" });
      } else {
        await rest("/rest/v1/debate_likes", session, {
          method: "POST",
          body: JSON.stringify({ debate_id: debateId, user_id: user.id }),
        });
      }
    } catch {
      setStatus("按讚狀態更新失敗，請稍後再試。");
    }
    await loadLikes();
    likeButton.disabled = false;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!session || !user) return;

    const body = textarea.value.trim();
    if (!body) {
      setStatus("請先輸入留言內容。");
      return;
    }

    submitButton.disabled = true;
    setStatus("留言送出中...");
    try {
      await rest("/rest/v1/debate_comments", session, {
        method: "POST",
        body: JSON.stringify({ debate_id: debateId, user_id: user.id, body }),
      });
      textarea.value = "";
      setStatus("留言已送出。");
      await loadComments();
    } catch {
      setStatus("留言送出失敗，請稍後再試。");
    }
    submitButton.disabled = false;
  });

  await loadProfile();
  await Promise.all([recordView(), loadLikes(), loadComments()]);
  setAuthUi();
}

async function main() {
  if (!roots.length) return;
  roots.forEach(renderShell);

  if (!isConfigured) {
    roots.forEach(renderDisabled);
    return;
  }

  roots.forEach((root) => {
    initEngagement(root).catch(() => {
      root.innerHTML = `
        <article class="engagement-card">
          <h3>互動功能暫時無法載入</h3>
          <p>請稍後再試，或確認 Supabase 設定是否正確。</p>
        </article>
      `;
    });
  });
}

main();
