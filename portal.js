const debateList = document.querySelector("[data-debate-list]");
const topicCount = document.querySelector("[data-topic-count]");
const latestLink = document.querySelector("[data-latest-link]");
const supabaseConfig = window.DEBATE_SUPABASE_CONFIG;

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function scoreLabel(debate) {
  if (!debate.affirmativeScore || !debate.negativeScore) return "";
  return `
    <div class="score-strip" aria-label="裁判總分">
      <span>${escapeHtml(debate.affirmative)} <strong>${escapeHtml(debate.affirmativeScore)}</strong></span>
      <span>${escapeHtml(debate.negative)} <strong>${escapeHtml(debate.negativeScore)}</strong></span>
    </div>
  `;
}

function debateStats(debate) {
  return `
    <div class="debate-card-stats" aria-label="讀者互動統計">
      <span>累積點閱 <strong data-card-view-count="${escapeHtml(debate.slug)}">--</strong></span>
    </div>
  `;
}

function debateCard(debate) {
  const href = `debates/${encodeURIComponent(debate.slug)}/`;
  const markdownHref = `${href}debate.md`;
  const cardClass = ["debate-card", debate.coverClass].filter(Boolean).join(" ");

  return `
    <article class="${cardClass}">
      <a class="debate-card-media" href="${href}" aria-label="查看${escapeHtml(debate.title)}辯論內容"></a>
      <div class="debate-card-body">
        <div class="debate-meta-row">
          <span>${escapeHtml(debate.dateLabel)}</span>
          <span>${escapeHtml(debate.category)}</span>
          <span>${escapeHtml(debate.winner)}</span>
        </div>
        <h3>${escapeHtml(debate.title)}</h3>
        <p>${escapeHtml(debate.summary)}</p>
        ${debateStats(debate)}
        ${scoreLabel(debate)}
        <div class="debate-card-actions">
          <a class="primary-link" href="${href}">查看辯論內容</a>
          <a href="${markdownHref}">Markdown</a>
        </div>
      </div>
    </article>
  `;
}

function renderDebates(debates) {
  const items = [...debates].sort((a, b) => new Date(b.publishAt) - new Date(a.publishAt));

  if (topicCount) topicCount.textContent = String(items.length);

  if (latestLink && items[0]) {
    latestLink.href = `debates/${encodeURIComponent(items[0].slug)}/`;
  }

  if (!debateList) return;

  if (!items.length) {
    debateList.innerHTML = `<article class="portal-empty">目前尚無已發布議題。</article>`;
    return;
  }

  debateList.innerHTML = items.map(debateCard).join("");
  loadPortalViewCounts(items);
}

function createSupabaseClient() {
  if (!supabaseConfig?.url || !supabaseConfig?.anonKey || !window.supabase?.createClient) {
    return null;
  }
  return window.supabase.createClient(supabaseConfig.url, supabaseConfig.anonKey);
}

function formatCount(value) {
  return new Intl.NumberFormat("zh-Hant-TW").format(value);
}

async function loadPortalViewCounts(debates) {
  const client = createSupabaseClient();
  if (!client || !debates.length) return;

  const debateIds = debates.map((debate) => debate.slug);
  const { data, error } = await client
    .from("debate_daily_views")
    .select("debate_id, view_count")
    .in("debate_id", debateIds);

  if (error || !data) return;

  const totals = data.reduce((result, row) => {
    result[row.debate_id] = (result[row.debate_id] || 0) + Number(row.view_count || 0);
    return result;
  }, {});

  debateIds.forEach((debateId) => {
    const countNode = document.querySelector(`[data-card-view-count="${CSS.escape(debateId)}"]`);
    if (countNode) countNode.textContent = formatCount(totals[debateId] || 0);
  });
}

fetch("debates.json", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error("Unable to load debates.json");
    return response.json();
  })
  .then(renderDebates)
  .catch(() => {
    if (debateList) {
      debateList.innerHTML = `<article class="portal-empty">目前無法載入議題清單。</article>`;
    }
  });
