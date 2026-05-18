const debateList = document.querySelector("[data-debate-list]");
const topicCount = document.querySelector("[data-topic-count]");
const latestLink = document.querySelector("[data-latest-link]");
const supabaseConfig = window.DEBATE_SUPABASE_CONFIG;
let supabaseClientPromise;

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

function dateLabel(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("zh-Hant-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Taipei",
  }).format(new Date(value)).replaceAll("/", "-");
}

function normalizeDebate(row) {
  return {
    slug: row.slug,
    publishAt: row.publish_at,
    dateLabel: dateLabel(row.publish_at),
    category: row.category || "",
    title: row.title || "",
    summary: row.summary || "",
    winner: row.winner_label || "",
    affirmative: row.affirmative_model || "",
    negative: row.negative_model || "",
    judge: row.judge_model || "",
    affirmativeScore: row.affirmative_score == null ? "" : String(row.affirmative_score),
    negativeScore: row.negative_score == null ? "" : String(row.negative_score),
    scoreTotal: row.score_total == null ? "" : String(row.score_total),
    coverClass: row.cover_class || "",
  };
}

function debateStats(debate) {
  return `
    <div class="debate-card-stats" aria-label="讀者互動統計">
      <span>累積點閱 <strong data-card-view-count="${escapeHtml(debate.slug)}">--</strong></span>
    </div>
  `;
}

function debateCard(debate) {
  const href = `debates/view/?slug=${encodeURIComponent(debate.slug)}`;
  const markdownHref = `debates/${encodeURIComponent(debate.slug)}/debate.md`;
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

async function createSupabaseClient() {
  if (!supabaseConfig?.url || !supabaseConfig?.anonKey) return null;
  if (!supabaseClientPromise) {
    supabaseClientPromise = import("https://esm.sh/@supabase/supabase-js@2")
      .then(({ createClient }) => createClient(supabaseConfig.url, supabaseConfig.anonKey))
      .catch(() => null);
  }
  return supabaseClientPromise;
}

async function supabaseRest(path) {
  if (!supabaseConfig?.url || !supabaseConfig?.anonKey) {
    throw new Error("Supabase is not configured");
  }
  const response = await fetch(`${supabaseConfig.url}/rest/v1/${path}`, {
    headers: {
      apikey: supabaseConfig.anonKey,
      Authorization: `Bearer ${supabaseConfig.anonKey}`,
    },
  });
  if (!response.ok) throw new Error(`Supabase REST error ${response.status}`);
  return response.json();
}

function formatCount(value) {
  return new Intl.NumberFormat("zh-Hant-TW").format(value);
}

async function loadPortalViewCounts(debates) {
  if (!debates.length) return;

  const debateIds = debates.map((debate) => debate.slug);
  let data;
  try {
    const ids = debateIds.map((id) => `"${id.replaceAll('"', '\\"')}"`).join(",");
    data = await supabaseRest(`debate_daily_views?select=debate_id,view_count&debate_id=in.(${encodeURIComponent(ids)})`);
  } catch {
    return;
  }

  const totals = data.reduce((result, row) => {
    result[row.debate_id] = (result[row.debate_id] || 0) + Number(row.view_count || 0);
    return result;
  }, {});

  debateIds.forEach((debateId) => {
    const countNode = document.querySelector(`[data-card-view-count="${CSS.escape(debateId)}"]`);
    if (countNode) countNode.textContent = formatCount(totals[debateId] || 0);
  });
}

async function loadDebatesFromSupabase() {
  const select = `
      slug,
      title,
      summary,
      category,
      status,
      publish_at,
      cover_class,
      affirmative_model,
      negative_model,
      judge_model,
      winner_label,
      affirmative_score,
      negative_score,
      score_total
    `.replace(/\s+/g, "");
  const data = await supabaseRest(`debates?select=${encodeURIComponent(select)}&status=eq.published&order=publish_at.desc`);
  return (data || []).map(normalizeDebate);
}

async function loadDebatesFromFallback() {
  const response = await fetch("debates.json", { cache: "no-store" });
  if (!response.ok) throw new Error("Unable to load debates.json");
  return response.json();
}

async function initPortal() {
  try {
    renderDebates(await loadDebatesFromSupabase());
    return;
  } catch {
    try {
      renderDebates(await loadDebatesFromFallback());
      return;
    } catch {
      if (debateList) {
        debateList.innerHTML = `<article class="portal-empty">目前無法載入議題清單。</article>`;
      }
    }
  }
}

initPortal();
