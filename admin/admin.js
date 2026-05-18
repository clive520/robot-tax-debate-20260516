const adminRoot = document.querySelector("[data-admin-root]");
const config = window.DEBATE_SUPABASE_CONFIG || {};
const storageKey = "ai_debate_supabase_session";

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

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

async function loadCurrentUser(session) {
  return rest("/auth/v1/user", session);
}

async function loadProfile(user, session) {
  const rows = await rest(`/rest/v1/profiles?select=id,display_name,is_admin&id=eq.${encodeURIComponent(user.id)}`, session);
  return rows?.[0] || null;
}

async function loadDebates(session) {
  return rest(
    "/rest/v1/debates?select=id,slug,title,status,publish_at,updated_at,debate_media(id,media_type,title,url,embed_url,status,sort_order)&order=publish_at.desc",
    session,
  );
}

function mediaField(debate, type, label) {
  const media = (debate.debate_media || []).find((item) => item.media_type === type);
  return `
    <label class="admin-field">
      <span>${label}</span>
      <input type="url" data-media-url data-media-type="${escapeHtml(type)}" data-media-id="${escapeHtml(media?.id || "")}" value="${escapeHtml(media?.url || "")}" placeholder="尚未設定">
    </label>
  `;
}

function renderAdmin(debates) {
  adminRoot.innerHTML = `
    <div class="admin-stack">
      ${debates.map((debate) => `
        <article class="debate-card admin-card" data-debate-id="${escapeHtml(debate.id)}">
          <div class="debate-card-body">
            <div class="debate-meta-row">
              <span>${escapeHtml(debate.status)}</span>
              <span>${escapeHtml(debate.publish_at || "未設定發布時間")}</span>
              <span>${escapeHtml(debate.slug)}</span>
            </div>
            <h3>${escapeHtml(debate.title)}</h3>
            <div class="admin-grid">
              ${mediaField(debate, "youtube", "YouTube URL")}
              ${mediaField(debate, "spotify_episode", "Spotify 單集 URL")}
              ${mediaField(debate, "mp3", "MP3 URL")}
            </div>
            <div class="debate-card-actions">
              <button type="button" class="primary-link" data-save-media>儲存媒體連結</button>
              <a href="../debates/view/?slug=${encodeURIComponent(debate.slug)}">預覽</a>
            </div>
            <p data-admin-status></p>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

async function saveMedia(card, session) {
  const debateId = card.dataset.debateId;
  const status = card.querySelector("[data-admin-status]");
  status.textContent = "儲存中...";

  for (const input of card.querySelectorAll("[data-media-url]")) {
    const value = input.value.trim();
    const mediaType = input.dataset.mediaType;
    const mediaId = input.dataset.mediaId;
    if (!value && !mediaId) continue;

    if (mediaId) {
      await rest(`/rest/v1/debate_media?id=eq.${encodeURIComponent(mediaId)}`, session, {
        method: "PATCH",
        body: JSON.stringify({
          url: value || null,
          status: value ? "available" : "pending",
          updated_at: new Date().toISOString(),
        }),
      });
    } else if (value) {
      await rest("/rest/v1/debate_media", session, {
        method: "POST",
        body: JSON.stringify({
          debate_id: debateId,
          media_type: mediaType,
          title: mediaType,
          url: value,
          status: "available",
        }),
      });
    }
  }

  status.textContent = "已儲存。";
}

async function init() {
  const session = readSession();
  if (!session) {
    adminRoot.innerHTML = `<article class="portal-empty">請先使用右上角 Google 登入。</article>`;
    return;
  }

  try {
    const user = await loadCurrentUser(session);
    const profile = await loadProfile(user, session);
    if (!profile?.is_admin) {
      adminRoot.innerHTML = `<article class="portal-empty">目前帳號不是管理員，無法進入後台。</article>`;
      return;
    }

    const debates = await loadDebates(session);
    renderAdmin(debates || []);
    adminRoot.querySelectorAll("[data-save-media]").forEach((button) => {
      button.addEventListener("click", () => {
        saveMedia(button.closest("[data-debate-id]"), session).catch((error) => {
          button.closest("[data-debate-id]").querySelector("[data-admin-status]").textContent = `儲存失敗：${error.message}`;
        });
      });
    });
  } catch (error) {
    adminRoot.innerHTML = `<article class="portal-empty">後台載入失敗：${escapeHtml(error.message)}</article>`;
  }
}

init();
