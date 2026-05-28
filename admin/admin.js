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

const defaultSegments = [
  ["affirmative_opening", "affirmative", "正方申論", 1],
  ["negative_opening", "negative", "反方申論", 2],
  ["affirmative_rebuttal", "affirmative", "正方駁論", 3],
  ["negative_rebuttal", "negative", "反方駁論", 4],
  ["negative_closing", "negative", "反方結辯", 5],
  ["affirmative_closing", "affirmative", "正方結辯", 6],
  ["judge_decision", "judge", "裁判段落", 7],
];

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
    "/rest/v1/debates?select=id,slug,title,summary,category,status,publish_at,updated_at,debate_media(id,media_type,title,url,embed_url,status,sort_order),debate_segments(id,round_key,speaker_role,speaker_name,title,content,sort_order,audio_url)&order=publish_at.desc",
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

function spotifyEmbedUrl(value) {
  if (!value) return "";
  const match = value.match(/open\.spotify\.com\/(episode|show)\/([^?/#]+)/);
  if (!match) return "";
  return `https://open.spotify.com/embed/${match[1]}/${match[2]}`;
}

function youtubeEmbedUrl(value) {
  if (!value) return "";
  const shortMatch = value.match(/youtu\.be\/([^?&#/]+)/);
  const watchMatch = value.match(/[?&]v=([^?&#/]+)/);
  const embedMatch = value.match(/youtube\.com\/embed\/([^?&#/]+)/);
  const id = shortMatch?.[1] || watchMatch?.[1] || embedMatch?.[1];
  return id ? `https://www.youtube.com/embed/${id}` : "";
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

function segmentRoleLabel(role) {
  if (role === "affirmative") return "正方";
  if (role === "negative") return "反方";
  return "裁判";
}

function segmentEditor(segment) {
  return `
    <fieldset class="admin-segment-field" data-segment-id="${escapeHtml(segment.id)}">
      <legend>${escapeHtml(segment.sort_order)}. ${escapeHtml(segment.title)} · ${escapeHtml(segmentRoleLabel(segment.speaker_role))}</legend>
      <div class="admin-grid admin-segment-meta">
        <label class="admin-field">
          <span>段落標題</span>
          <input type="text" data-segment-title value="${escapeHtml(segment.title)}">
        </label>
        <label class="admin-field">
          <span>說話者</span>
          <input type="text" data-segment-speaker value="${escapeHtml(segment.speaker_name)}">
        </label>
        <label class="admin-field">
          <span>音檔 URL</span>
          <input type="url" data-segment-audio value="${escapeHtml(segment.audio_url || "")}">
        </label>
      </div>
      <label class="admin-field">
        <span>內容</span>
        <textarea data-segment-content rows="12">${escapeHtml(segment.content)}</textarea>
      </label>
    </fieldset>
  `;
}

function segmentsEditor(debate) {
  const segments = [...(debate.debate_segments || [])].sort((a, b) => a.sort_order - b.sort_order);
  if (!segments.length) {
    return `<article class="portal-empty">這篇文章目前沒有段落內容。</article>`;
  }
  return `
    <section class="admin-editor-section">
      <div class="admin-list-toolbar">
        <div>
          <p class="eyebrow">Transcript</p>
          <h3>辯論與裁判內容</h3>
        </div>
      </div>
      <div class="admin-segment-stack">
        ${segments.map(segmentEditor).join("")}
      </div>
    </section>
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
      <div class="admin-row-actions">
        <button type="button" data-new-debate>新增辯論</button>
        <button type="button" data-refresh-list>重新整理</button>
      </div>
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
  adminRoot.querySelector("[data-new-debate]").addEventListener("click", renderNewDebateForm);
  adminRoot.querySelectorAll("[data-edit-debate]").forEach((button) => {
    button.addEventListener("click", () => {
      renderEditor(findDebate(button.closest("[data-debate-id]").dataset.debateId));
    });
  });
  adminRoot.querySelectorAll("[data-archive-debate]").forEach((button) => {
    button.addEventListener("click", () => archiveDebate(button.closest("[data-debate-id]").dataset.debateId));
  });
}

function renderNewDebateForm() {
  currentMode = "new";
  adminRoot.innerHTML = `
    <article class="debate-card admin-card">
      <div class="debate-card-body">
        <div class="admin-list-toolbar">
          <div>
            <p class="eyebrow">New Debate</p>
            <h2>新增辯論草稿</h2>
          </div>
          <button type="button" data-back-list>回列表</button>
        </div>
        <div class="admin-grid admin-main-grid">
          <label class="admin-field">
            <span>slug</span>
            <input type="text" data-new-slug placeholder="例如 ai-education-202606" required>
          </label>
          <label class="admin-field">
            <span>分類</span>
            <input type="text" data-new-category placeholder="例如 教育政策">
          </label>
          <label class="admin-field">
            <span>狀態</span>
            <select data-new-status>
              <option value="draft">草稿</option>
              <option value="scheduled">排程</option>
              <option value="published">已發布</option>
            </select>
          </label>
          <label class="admin-field">
            <span>發布時間</span>
            <input type="datetime-local" data-new-publish-at>
          </label>
        </div>
        <label class="admin-field">
          <span>標題</span>
          <input type="text" data-new-title placeholder="輸入辯論題目" required>
        </label>
        <label class="admin-field">
          <span>摘要</span>
          <textarea data-new-summary rows="3" placeholder="首頁卡片摘要"></textarea>
        </label>
        <div class="admin-grid admin-main-grid">
          <label class="admin-field">
            <span>正方</span>
            <input type="text" data-new-affirmative value="Codex">
          </label>
          <label class="admin-field">
            <span>反方</span>
            <input type="text" data-new-negative value="Gemini">
          </label>
          <label class="admin-field">
            <span>裁判</span>
            <input type="text" data-new-judge value="Claude">
          </label>
          <label class="admin-field">
            <span>勝方</span>
            <select data-new-winner>
              <option value="">未判定</option>
              <option value="affirmative">正方</option>
              <option value="negative">反方</option>
              <option value="tie">平手</option>
            </select>
          </label>
        </div>
        <div class="debate-card-actions">
          <button type="button" class="primary-link" data-create-debate>建立草稿</button>
        </div>
        <p data-admin-status></p>
      </div>
    </article>
  `;
  adminRoot.querySelector("[data-back-list]").addEventListener("click", renderList);
  adminRoot.querySelector("[data-create-debate]").addEventListener("click", createDebateFromForm);
}

function slugIsValid(slug) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

function newDebatePayload() {
  const slug = adminRoot.querySelector("[data-new-slug]").value.trim();
  const title = adminRoot.querySelector("[data-new-title]").value.trim();
  const winner = adminRoot.querySelector("[data-new-winner]").value;
  return {
    slug,
    title,
    summary: adminRoot.querySelector("[data-new-summary]").value.trim(),
    category: adminRoot.querySelector("[data-new-category]").value.trim(),
    status: adminRoot.querySelector("[data-new-status]").value,
    publish_at: fromLocalDateTime(adminRoot.querySelector("[data-new-publish-at]").value),
    affirmative_model: adminRoot.querySelector("[data-new-affirmative]").value.trim(),
    negative_model: adminRoot.querySelector("[data-new-negative]").value.trim(),
    judge_model: adminRoot.querySelector("[data-new-judge]").value.trim(),
    winner,
    winner_label: winner === "affirmative" ? "正方勝" : winner === "negative" ? "反方勝" : winner === "tie" ? "平手" : "",
    affirmative_score: null,
    negative_score: null,
    score_total: null,
    source_markdown_url: "",
  };
}

function defaultSegmentRows(debate) {
  return defaultSegments.map(([roundKey, role, title, sortOrder]) => ({
    debate_id: debate.id,
    round_key: roundKey,
    speaker_role: role,
    speaker_name:
      role === "affirmative"
        ? debate.affirmative_model
        : role === "negative"
          ? debate.negative_model
          : debate.judge_model,
    title,
    content: `${title}\n\n請在這裡輸入內容。`,
    sort_order: sortOrder,
    audio_url: null,
  }));
}

async function createDebateFromForm() {
  const status = adminRoot.querySelector("[data-admin-status]");
  const payload = newDebatePayload();
  if (!slugIsValid(payload.slug)) {
    status.textContent = "slug 只能使用小寫英文、數字與連字號，例如 new-topic-202606。";
    return;
  }
  if (!payload.title) {
    status.textContent = "請先輸入標題。";
    return;
  }

  status.textContent = "建立中...";
  try {
    const rows = await rest("/rest/v1/debates", adminSession, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const debate = rows?.[0];
    await rest("/rest/v1/debate_segments", adminSession, {
      method: "POST",
      body: JSON.stringify(defaultSegmentRows(debate)),
    });
    await rest("/rest/v1/debate_media", adminSession, {
      method: "POST",
      body: JSON.stringify(["youtube", "spotify_episode", "mp3"].map((type, index) => ({
        debate_id: debate.id,
        media_type: type,
        title: mediaLabels[type],
        status: "pending",
        sort_order: index + 1,
      }))),
    });
    allDebates = await loadDebates(adminSession);
    renderEditor(findDebate(debate.id));
  } catch (error) {
    status.textContent = `建立失敗：${error.message}`;
  }
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

function editorActionsMarkup(slug, placement = "bottom") {
  return `
    <div class="debate-card-actions admin-editor-actions admin-editor-actions-${placement}">
      <button type="button" class="primary-link" data-save-all>全部儲存</button>
      <button type="button" data-save-debate>只存文章資料</button>
      <button type="button" data-save-media>只存媒體連結</button>
      <button type="button" data-save-segments>只存段落內容</button>
      <a href="../debates/view/?slug=${encodeURIComponent(slug)}">預覽</a>
    </div>
  `;
}

function bindEditorActions(card) {
  card.querySelectorAll("[data-save-all]").forEach((button) => {
    button.addEventListener("click", () => runSave(card, "all"));
  });
  card.querySelectorAll("[data-save-debate]").forEach((button) => {
    button.addEventListener("click", () => runSave(card, "debate"));
  });
  card.querySelectorAll("[data-save-media]").forEach((button) => {
    button.addEventListener("click", () => runSave(card, "media"));
  });
  card.querySelectorAll("[data-save-segments]").forEach((button) => {
    button.addEventListener("click", () => runSave(card, "segments"));
  });
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
        ${segmentsEditor(debate)}
        ${editorActionsMarkup(debate.slug, "bottom")}
        <p data-admin-status></p>
      </div>
    </article>
  `;

  adminRoot.querySelector("[data-back-list]").addEventListener("click", renderList);
  bindEditorActions(adminRoot.querySelector("[data-debate-id]"));
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
  const manualEmbedUrl = field.querySelector("[data-media-embed-url]").value.trim();
  const generatedEmbedUrl =
    field.dataset.mediaType === "spotify_episode"
      ? spotifyEmbedUrl(manualEmbedUrl || url)
      : field.dataset.mediaType === "youtube"
        ? youtubeEmbedUrl(manualEmbedUrl || url)
        : "";
  const embedUrl = manualEmbedUrl || generatedEmbedUrl;
  const selectedStatus = field.querySelector("[data-media-status]").value;
  return {
    debate_id: debateId,
    media_type: field.dataset.mediaType,
    title: mediaLabels[field.dataset.mediaType] || field.dataset.mediaType,
    url: url || null,
    embed_url: embedUrl || null,
    status: (url || embedUrl) && selectedStatus === "pending" ? "available" : selectedStatus,
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

function segmentPayload(field) {
  return {
    title: field.querySelector("[data-segment-title]").value.trim(),
    speaker_name: field.querySelector("[data-segment-speaker]").value.trim(),
    audio_url: field.querySelector("[data-segment-audio]").value.trim() || null,
    content: field.querySelector("[data-segment-content]").value.trim(),
    updated_at: new Date().toISOString(),
  };
}

async function saveSegments(card) {
  for (const field of card.querySelectorAll("[data-segment-id]")) {
    await rest(`/rest/v1/debate_segments?id=eq.${encodeURIComponent(field.dataset.segmentId)}`, adminSession, {
      method: "PATCH",
      body: JSON.stringify(segmentPayload(field)),
    });
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
    if (mode === "all" || mode === "segments") await saveSegments(card);
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
