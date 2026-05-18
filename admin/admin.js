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

let adminSession = null;
let allDebates = [];
let currentMode = "list";

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

function statusLabel(value) {
  return statusOptions.find(([key]) => key === value)?.[1] || value;
}

function mediaFor(debate, type) {
  return (debate.debate_media || []).find((item) => item.media_type === type) || {};
}

function statusSelect(current) {
  return `
    <select data-field="status">
      ${statusOptions.map(([value, label]) => `<option value="${value}" ${value === current ? "selected" : ""}>${label}</option>`).join("")}
    </select>
  `;
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

function renderList() {
  currentMode = "list";
  adminRoot.innerHTML = `
    <div class="admin-list-toolbar">
      <div>
        <p class="eyebrow">Debate Admin</p>
        <h2>辯論文章列表</h2>
      </div>
      <button type="button" data-refresh-list>重新整理</button>
    </div>
    <div class="admin-table-wrap">
      <table class="admin-table">
        <thead>
          <tr>
            <th>題目</th>
            <th>分類</th>
            <th>狀態</th>
            <th>發布時間</th>
            <th>媒體</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${allDebates.map((debate) => `
            <tr data-debate-id="${escapeHtml(debate.id)}">
              <td>
                <strong>${escapeHtml(debate.title)}</strong>
                <span>${escapeHtml(debate.slug)}</span>
              </td>
              <td>${escapeHtml(debate.category)}</td>
              <td><span class="admin-status-pill admin-status-${escapeHtml(debate.status)}">${escapeHtml(statusLabel(debate.status))}</span></td>
              <td>${escapeHtml(debate.publish_at || "未設定")}</td>
              <td>${renderMediaSummary(debate)}</td>
              <td>
                <div class="admin-row-actions">
                  <button type="button" data-edit-debate>編輯</button>
                  <a href="../debates/view/?slug=${encodeURIComponent(debate.slug)}">預覽</a>
                  <button type="button" data-archive-debate>封存</button>
                </div>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  adminRoot.querySelector("[data-refresh-list]").addEventListener("click", refreshList);
  adminRoot.querySelectorAll("[data-edit-debate]").forEach((button) => {
    button.addEventListener("click", () => {
      renderEditor(findDebate(button.closest("[data-debate-id]").dataset.debateId));
    });
  });
  adminRoot.querySelectorAll("[data-archive-debate]").forEach((button) => {
    button.addEventListener("click", () => archiveDebate(button.closest("[data-debate-id]").dataset.debateId));
  });
}

function renderMediaSummary(debate) {
  return ["youtube", "spotify_episode", "mp3"].map((type) => {
    const media = mediaFor(debate, type);
    const available = media.status === "available" && (media.url || media.embed_url);
    return `<span class="admin-media-pill ${available ? "is-ready" : ""}">${escapeHtml(mediaLabels[type])}</span>`;
  }).join("");
}

function findDebate(id) {
  return allDebates.find((debate) => debate.id === id);
}

function renderEditor(debate) {
  if (!debate) {
    renderList();
    return;
  }
  currentMode = "editor";
  adminRoot.innerHTML = `
    <article class="debate-card admin-card" data-debate-id="${escapeHtml(debate.id)}" data-debate-slug="${escapeHtml(debate.slug)}">
      <div class="debate-card-body">
        <div class="admin-list-toolbar">
          <div>
            <p class="eyebrow">Editing</p>
            <h2>${escapeHtml(debate.title)}</h2>
          </div>
          <button type="button" data-back-list>回列表</button>
        </div>
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
  `;

  adminRoot.querySelector("[data-back-list]").addEventListener("click", renderList);
  adminRoot.querySelector("[data-save-all]").addEventListener("click", () => runSave(adminRoot.querySelector("[data-debate-id]"), "all"));
  adminRoot.querySelector("[data-save-debate]").addEventListener("click", () => runSave(adminRoot.querySelector("[data-debate-id]"), "debate"));
  adminRoot.querySelector("[data-save-media]").addEventListener("click", () => runSave(adminRoot.querySelector("[data-debate-id]"), "media"));
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

async function saveDebate(card) {
  const rows = await rest(`/rest/v1/debates?id=eq.${encodeURIComponent(card.dataset.debateId)}`, adminSession, {
    method: "PATCH",
    body: JSON.stringify(debatePayload(card)),
  });
  updateCachedDebate(rows?.[0]);
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

async function saveMedia(card) {
  const debateId = card.dataset.debateId;
  for (const field of card.querySelectorAll("[data-media-type]")) {
    const payload = mediaPayload(field, debateId);
    const mediaId = field.dataset.mediaId;
    if (mediaId) {
      await rest(`/rest/v1/debate_media?id=eq.${encodeURIComponent(mediaId)}`, adminSession, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else if (payload.url || payload.embed_url) {
      const rows = await rest("/rest/v1/debate_media", adminSession, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      field.dataset.mediaId = rows?.[0]?.id || "";
    }
  }
}

function updateCachedDebate(nextDebate) {
  if (!nextDebate) return;
  allDebates = allDebates.map((debate) => debate.id === nextDebate.id ? { ...debate, ...nextDebate } : debate);
}

async function runSave(card, mode) {
  const status = card.querySelector("[data-admin-status]");
  status.textContent = "儲存中...";
  try {
    if (mode === "all" || mode === "debate") await saveDebate(card);
    if (mode === "all" || mode === "media") await saveMedia(card);
    allDebates = await loadDebates(adminSession);
    status.textContent = "已儲存。";
  } catch (error) {
    status.textContent = `儲存失敗：${error.message}`;
  }
}

async function archiveDebate(id) {
  const debate = findDebate(id);
  if (!debate || !window.confirm(`確定要封存「${debate.title}」？`)) return;
  await rest(`/rest/v1/debates?id=eq.${encodeURIComponent(id)}`, adminSession, {
    method: "PATCH",
    body: JSON.stringify({ status: "archived", updated_at: new Date().toISOString() }),
  });
  await refreshList();
}

async function refreshList() {
  adminRoot.innerHTML = `<article class="portal-empty">正在重新整理列表。</article>`;
  allDebates = await loadDebates(adminSession);
  renderList();
}

async function init() {
  adminSession = readSession();
  if (!adminSession) {
    adminRoot.innerHTML = `<article class="portal-empty">請先使用右上角 Google 登入。</article>`;
    return;
  }

  try {
    const user = await loadCurrentUser(adminSession);
    const profile = await loadProfile(user, adminSession);
    if (!profile?.is_admin) {
      adminRoot.innerHTML = `<article class="portal-empty">目前帳號不是管理員，無法進入後台。</article>`;
      return;
    }

    allDebates = await loadDebates(adminSession);
    renderList();
  } catch (error) {
    adminRoot.innerHTML = `<article class="portal-empty">後台載入失敗：${escapeHtml(error.message)}</article>`;
  }
}

init();
