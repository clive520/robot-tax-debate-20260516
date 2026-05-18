const adminRoot = document.querySelector("[data-admin-root]");
const config = window.DEBATE_SUPABASE_CONFIG || {};
const storageKey = "ai_debate_supabase_session";

const statusOptions = [
  ["draft", "草稿"],
  ["scheduled", "排程"],
  ["published", "已發布"],
  ["archived", "封存"],
];

const mediaLabels = {
  youtube: "YouTube",
  spotify_episode: "Spotify 單集",
  mp3: "MP3 備援",
};

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
    "/rest/v1/debates?select=id,slug,title,summary,category,status,publish_at,updated_at,debate_media(id,media_type,title,url,embed_url,status,sort_order)&order=publish_at.desc",
    session,
  );
}

function toLocalDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function fromLocalDateTime(value) {
  if (!value) return null;
  return new Date(value).toISOString();
}

function statusSelect(current) {
  return `
    <select data-field="status">
      ${statusOptions.map(([value, label]) => `<option value="${value}" ${value === current ? "selected" : ""}>${label}</option>`).join("")}
    </select>
  `;
}

function mediaFor(debate, type) {
  return (debate.debate_media || []).find((item) => item.media_type === type) || {};
}

function mediaField(debate, type) {
  const media = mediaFor(debate, type);
  return `
    <fieldset class="admin-media-field" data-media-type="${escapeHtml(type)}" data-media-id="${escapeHtml(media.id || "")}">
      <legend>${mediaLabels[type]}</legend>
      <label class="admin-field">
        <span>URL</span>
        <input type="url" data-media-url value="${escapeHtml(media.url || "")}" placeholder="https://">
      </label>
      <label class="admin-field">
        <span>Embed URL</span>
        <input type="url" data-media-embed-url value="${escapeHtml(media.embed_url || "")}" placeholder="可留空">
      </label>
      <label class="admin-field">
        <span>狀態</span>
        <select data-media-status>
          <option value="pending" ${media.status === "pending" ? "selected" : ""}>pending</option>
          <option value="available" ${media.status === "available" ? "selected" : ""}>available</option>
          <option value="hidden" ${media.status === "hidden" ? "selected" : ""}>hidden</option>
        </select>
      </label>
    </fieldset>
  `;
}

function renderAdmin(debates) {
  adminRoot.innerHTML = `
    <div class="admin-stack">
      ${debates.map((debate) => `
        <article class="debate-card admin-card" data-debate-id="${escapeHtml(debate.id)}" data-debate-slug="${escapeHtml(debate.slug)}">
          <div class="debate-card-body">
            <div class="debate-meta-row">
              <span>${escapeHtml(debate.slug)}</span>
              <span>更新：${escapeHtml(debate.updated_at || "--")}</span>
            </div>
            <div class="admin-grid admin-main-grid">
              <label class="admin-field">
                <span>標題</span>
                <input type="text" data-field="title" value="${escapeHtml(debate.title)}">
              </label>
              <label class="admin-field">
                <span>分類</span>
                <input type="text" data-field="category" value="${escapeHtml(debate.category)}">
              </label>
              <label class="admin-field">
                <span>狀態</span>
                ${statusSelect(debate.status)}
              </label>
              <label class="admin-field">
                <span>發布時間</span>
                <input type="datetime-local" data-field="publish_at" value="${escapeHtml(toLocalDateTime(debate.publish_at))}">
              </label>
            </div>
            <label class="admin-field">
              <span>摘要</span>
              <textarea data-field="summary" rows="3">${escapeHtml(debate.summary)}</textarea>
            </label>
            <div class="admin-media-grid">
              ${mediaField(debate, "youtube")}
              ${mediaField(debate, "spotify_episode")}
              ${mediaField(debate, "mp3")}
            </div>
            <div class="debate-card-actions">
              <button type="button" class="primary-link" data-save-all>全部儲存</button>
              <button type="button" data-save-debate>只存文章資料</button>
              <button type="button" data-save-media>只存媒體連結</button>
              <a href="../debates/view/?slug=${encodeURIComponent(debate.slug)}">預覽</a>
            </div>
            <p data-admin-status></p>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function debatePayload(card) {
  return {
    title: card.querySelector('[data-field="title"]').value.trim(),
    summary: card.querySelector('[data-field="summary"]').value.trim(),
    category: card.querySelector('[data-field="category"]').value.trim(),
    status: card.querySelector('[data-field="status"]').value,
    publish_at: fromLocalDateTime(card.querySelector('[data-field="publish_at"]').value),
    updated_at: new Date().toISOString(),
  };
}

async function saveDebate(card, session) {
  await rest(`/rest/v1/debates?id=eq.${encodeURIComponent(card.dataset.debateId)}`, session, {
    method: "PATCH",
    body: JSON.stringify(debatePayload(card)),
  });
}

function mediaPayload(field, debateId) {
  const url = field.querySelector("[data-media-url]").value.trim();
  const embedUrl = field.querySelector("[data-media-embed-url]").value.trim();
  return {
    debate_id: debateId,
    media_type: field.dataset.mediaType,
    title: mediaLabels[field.dataset.mediaType] || field.dataset.mediaType,
    url: url || null,
    embed_url: embedUrl || null,
    status: field.querySelector("[data-media-status]").value,
    updated_at: new Date().toISOString(),
  };
}

async function saveMedia(card, session) {
  const debateId = card.dataset.debateId;
  for (const field of card.querySelectorAll("[data-media-type]")) {
    const payload = mediaPayload(field, debateId);
    const mediaId = field.dataset.mediaId;
    if (mediaId) {
      await rest(`/rest/v1/debate_media?id=eq.${encodeURIComponent(mediaId)}`, session, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else if (payload.url || payload.embed_url) {
      const rows = await rest("/rest/v1/debate_media", session, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      field.dataset.mediaId = rows?.[0]?.id || "";
    }
  }
}

async function runSave(card, session, mode) {
  const status = card.querySelector("[data-admin-status]");
  status.textContent = "儲存中...";
  try {
    if (mode === "all" || mode === "debate") await saveDebate(card, session);
    if (mode === "all" || mode === "media") await saveMedia(card, session);
    status.textContent = "已儲存。";
  } catch (error) {
    status.textContent = `儲存失敗：${error.message}`;
  }
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
    adminRoot.querySelectorAll("[data-save-all]").forEach((button) => {
      button.addEventListener("click", () => runSave(button.closest("[data-debate-id]"), session, "all"));
    });
    adminRoot.querySelectorAll("[data-save-debate]").forEach((button) => {
      button.addEventListener("click", () => runSave(button.closest("[data-debate-id]"), session, "debate"));
    });
    adminRoot.querySelectorAll("[data-save-media]").forEach((button) => {
      button.addEventListener("click", () => runSave(button.closest("[data-debate-id]"), session, "media"));
    });
  } catch (error) {
    adminRoot.innerHTML = `<article class="portal-empty">後台載入失敗：${escapeHtml(error.message)}</article>`;
  }
}

init();
