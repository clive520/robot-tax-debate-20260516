const roots = document.querySelectorAll("[data-engagement-root]");
const config = window.DEBATE_SUPABASE_CONFIG || {};
const isConfigured =
  Boolean(config.url) &&
  Boolean(config.anonKey) &&
  !config.url.includes("YOUR_") &&
  !config.anonKey.includes("YOUR_");

const nestedTokenIndex = window.location.href.indexOf("#access_token=");
if (nestedTokenIndex > -1 && !window.location.hash.startsWith("#access_token=")) {
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.href.slice(nestedTokenIndex)}`);
}

function formatDate(value) {
  return new Intl.DateTimeFormat("zh-TW", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function renderDisabled(root) {
  root.innerHTML = `
    <article class="engagement-card">
      <div>
        <p class="eyebrow">Community</p>
        <h3>互動功能尚未啟用</h3>
        <p>完成 Supabase 專案設定，並在 <code>supabase-config.js</code> 填入 Project URL 與 anon key 後，這裡會出現 Google 登入、按讚與留言功能。</p>
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

async function initEngagement(root, supabase) {
  const debateId = root.dataset.debateId;
  const loginButton = root.querySelector("[data-login]");
  const logoutButton = root.querySelector("[data-logout]");
  const authLabel = root.querySelector("[data-auth-label]");
  const likeButton = root.querySelector("[data-like]");
  const likeCount = root.querySelector("[data-like-count]");
  const form = root.querySelector("[data-comment-form]");
  const textarea = root.querySelector("[data-comment-body]");
  const submitButton = form.querySelector("button[type='submit']");
  const status = root.querySelector("[data-comment-status]");
  const list = root.querySelector("[data-comment-list]");

  let session = null;
  let profile = null;
  let liked = false;

  function setStatus(message) {
    status.textContent = message || "";
  }

  function setAuthUi() {
    const isSignedIn = Boolean(session);
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
      session.user.user_metadata?.full_name ||
      session.user.email ||
      "已登入使用者";
    authLabel.textContent = `目前登入：${displayName}${profile?.is_admin ? "（管理者）" : ""}`;
    likeButton.textContent = liked ? "已按讚" : "按讚";
  }

  async function loadProfile() {
    profile = null;
    if (!session) return;
    const { data } = await supabase
      .from("profiles")
      .select("display_name, avatar_url, is_admin")
      .eq("id", session.user.id)
      .maybeSingle();
    profile = data;
  }

  async function loadLikes() {
    const { count } = await supabase
      .from("debate_likes")
      .select("*", { count: "exact", head: true })
      .eq("debate_id", debateId);

    likeCount.textContent = `${count || 0} 個讚`;
    liked = false;

    if (session) {
      const { data } = await supabase
        .from("debate_likes")
        .select("user_id")
        .eq("debate_id", debateId)
        .eq("user_id", session.user.id)
        .maybeSingle();
      liked = Boolean(data);
    }
    setAuthUi();
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
        const { error } = await supabase
          .from("debate_comments")
          .delete()
          .eq("id", comment.id);
        if (error) {
          deleteButton.disabled = false;
          setStatus("刪除失敗，請稍後再試。");
          return;
        }
        setStatus("留言已刪除。");
        await loadComments();
      });
      item.append(deleteButton);
    }

    list.appendChild(item);
  }

  async function loadComments() {
    const { data, error } = await supabase
      .from("debate_comments")
      .select("id, body, created_at, user_id, profiles(display_name, avatar_url)")
      .eq("debate_id", debateId)
      .order("created_at", { ascending: false })
      .limit(50);

    list.innerHTML = "";
    if (error) {
      list.innerHTML = `<p class="empty-comments">留言暫時無法載入。</p>`;
      return;
    }

    if (!data?.length) {
      renderEmptyComments();
      return;
    }

    data.forEach(appendComment);
  }

  async function refresh() {
    const { data } = await supabase.auth.getSession();
    session = data.session;
    await loadProfile();
    await Promise.all([loadLikes(), loadComments()]);
    setAuthUi();
    if (session && window.location.hash.includes("access_token")) {
      window.history.replaceState(null, "", `${window.location.pathname}#engagement`);
    }
  }

  loginButton.addEventListener("click", async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}${window.location.pathname}`
      }
    });
  });

  logoutButton.addEventListener("click", async () => {
    await supabase.auth.signOut();
  });

  likeButton.addEventListener("click", async () => {
    if (!session) return;
    likeButton.disabled = true;

    const request = liked
      ? supabase
          .from("debate_likes")
          .delete()
          .eq("debate_id", debateId)
          .eq("user_id", session.user.id)
      : supabase.from("debate_likes").insert({
          debate_id: debateId,
          user_id: session.user.id
        });

    const { error } = await request;
    if (error) setStatus("按讚狀態更新失敗，請稍後再試。");
    await loadLikes();
    likeButton.disabled = false;
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!session) return;

    const body = textarea.value.trim();
    if (!body) {
      setStatus("請先輸入留言內容。");
      return;
    }

    submitButton.disabled = true;
    setStatus("留言送出中...");
    const { error } = await supabase.from("debate_comments").insert({
      debate_id: debateId,
      user_id: session.user.id,
      body
    });

    if (error) {
      setStatus("留言送出失敗，請稍後再試。");
      submitButton.disabled = false;
      return;
    }

    textarea.value = "";
    setStatus("留言已送出。");
    await loadComments();
    submitButton.disabled = false;
  });

  supabase.auth.onAuthStateChange(async (_event, nextSession) => {
    session = nextSession;
    await loadProfile();
    await Promise.all([loadLikes(), loadComments()]);
    setAuthUi();
  });

  await refresh();
}

async function main() {
  if (!roots.length) return;

  roots.forEach(renderShell);

  if (!isConfigured) {
    roots.forEach(renderDisabled);
    return;
  }

  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(config.url, config.anonKey);

  roots.forEach((root) => {
    initEngagement(root, supabase).catch(() => {
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
