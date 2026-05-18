const config = window.DEBATE_SUPABASE_CONFIG || {};
const params = new URLSearchParams(window.location.search);
const slug = params.get("slug") || "";

const nodes = {
  title: document.querySelector("[data-debate-title]"),
  summary: document.querySelector("[data-debate-summary]"),
  judge: document.querySelector("[data-role-judge]"),
  affirmative: document.querySelector("[data-role-affirmative]"),
  negative: document.querySelector("[data-role-negative]"),
  winner: document.querySelector("[data-winner]"),
  scoreSummary: document.querySelector("[data-score-summary]"),
  markdownLink: document.querySelector("[data-markdown-link]"),
  mediaGrid: document.querySelector("[data-media-grid]"),
  debateSections: document.querySelector("[data-debate-sections]"),
  judgeSection: document.querySelector("[data-judge-section]"),
  engagementRoot: document.querySelector("[data-engagement-root]"),
};
const segmentLikeState = new Map();
let activeClient;
let activeSession = null;

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineMarkdown(text) {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function renderTable(lines) {
  const rows = lines
    .filter((line) => !/^\|\s*-+/.test(line))
    .map((line) => line.trim().slice(1, -1).split("|").map((cell) => inlineMarkdown(cell.trim())));
  const head = rows.shift() || [];
  const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("");
  return `<div class="table-wrap"><table><thead><tr>${head.map((cell) => `<th>${cell}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`;
}

function renderMarkdownBlock(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let table = [];
  let quote = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };
  const flushTable = () => {
    if (!table.length) return;
    html.push(renderTable(table));
    table = [];
  };
  const flushQuote = () => {
    if (!quote.length) return;
    html.push(`<blockquote>${quote.map((line) => `<p>${inlineMarkdown(line)}</p>`).join("")}</blockquote>`);
    quote = [];
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flushParagraph();
      flushTable();
      flushQuote();
      continue;
    }
    if (line.startsWith("|")) {
      flushParagraph();
      flushQuote();
      table.push(line);
      continue;
    }
    if (line.startsWith(">")) {
      flushParagraph();
      flushTable();
      quote.push(line.replace(/^>\s?/, ""));
      continue;
    }
    if (line.startsWith("#### ")) {
      flushParagraph();
      flushTable();
      flushQuote();
      html.push(`<h4>${inlineMarkdown(line.slice(5))}</h4>`);
      continue;
    }
    if (line.startsWith("### ")) {
      flushParagraph();
      flushTable();
      flushQuote();
      html.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`);
      continue;
    }
    paragraph.push(line);
  }

  flushParagraph();
  flushTable();
  flushQuote();
  return html.join("");
}

function roleClass(role) {
  if (role === "affirmative") return "positive";
  if (role === "negative") return "negative";
  return "judge";
}

function roleLabel(segment) {
  if (segment.speaker_role === "affirmative") return `正方 ${segment.speaker_name}`;
  if (segment.speaker_role === "negative") return `反方 ${segment.speaker_name}`;
  return `裁判 ${segment.speaker_name}`;
}

function isLikableSegment(segment) {
  return segment.speaker_role === "affirmative" || segment.speaker_role === "negative";
}

function mediaByType(media, type) {
  return media.find((item) => item.media_type === type && item.status === "available");
}

async function createSupabaseClient() {
  if (!config.url || !config.anonKey) throw new Error("Supabase is not configured");
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  return createClient(config.url, config.anonKey);
}

async function supabaseRest(path) {
  if (!config.url || !config.anonKey) throw new Error("Supabase is not configured");
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
    },
  });
  if (!response.ok) throw new Error(`Supabase REST error ${response.status}`);
  return response.json();
}

async function loadDebate() {
  const select = `
      id,
      slug,
      title,
      summary,
      category,
      status,
      publish_at,
      affirmative_model,
      negative_model,
      judge_model,
      winner_label,
      affirmative_score,
      negative_score,
      score_total,
      source_markdown_url,
      debate_segments (
        round_key,
        speaker_role,
        speaker_name,
        title,
        content,
        sort_order,
        audio_url
      ),
      debate_scorecards (
        criterion,
        affirmative_score,
        negative_score,
        comment,
        sort_order
      ),
      debate_media (
        media_type,
        title,
        url,
        embed_url,
        status,
        sort_order
      )
    `.replace(/\s+/g, "");
  const data = await supabaseRest(`debates?select=${encodeURIComponent(select)}&slug=eq.${encodeURIComponent(slug)}`);

  if (!data?.[0]) throw new Error("Debate not found");
  return data[0];
}

function renderHero(debate) {
  document.title = `${debate.title}｜AI 辯論所`;
  nodes.title.textContent = debate.title;
  nodes.summary.textContent = debate.summary;
  nodes.judge.textContent = debate.judge_model || "--";
  nodes.affirmative.textContent = debate.affirmative_model || "--";
  nodes.negative.textContent = debate.negative_model || "--";
  nodes.winner.textContent = debate.winner_label || "--";
  nodes.scoreSummary.innerHTML = `${escapeHtml(debate.affirmative_model)} ${escapeHtml(debate.affirmative_score)} / ${escapeHtml(debate.score_total)}<br>${escapeHtml(debate.negative_model)} ${escapeHtml(debate.negative_score)} / ${escapeHtml(debate.score_total)}`;
  nodes.markdownLink.href = debate.source_markdown_url || `../${encodeURIComponent(debate.slug)}/debate.md`;
  if (nodes.engagementRoot) nodes.engagementRoot.dataset.debateId = debate.slug;
}

function renderMedia(media) {
  const youtube = mediaByType(media, "youtube");
  const spotifyEpisode = mediaByType(media, "spotify_episode");
  const spotifyShow = mediaByType(media, "spotify_show");
  const mp3 = mediaByType(media, "mp3");

  const youtubePanel = youtube
    ? `<div class="video-frame"><iframe src="${escapeHtml(youtube.embed_url || youtube.url)}" title="${escapeHtml(youtube.title)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><p>本集影片已公開上架。</p>`
    : `<p>影片製作中。</p>`;

  let podcastPanel = `<p>Podcast 製作中。</p>`;
  if (spotifyEpisode?.embed_url) {
    podcastPanel = `<div class="video-frame spotify-frame"><iframe src="${escapeHtml(spotifyEpisode.embed_url)}" title="${escapeHtml(spotifyEpisode.title)}" loading="lazy" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"></iframe></div>`;
  } else if (mp3?.url) {
    podcastPanel = `<div class="podcast-player"><p>Spotify 單集網址尚未設定時，先使用網頁 MP3 備援播放。</p><audio controls preload="metadata" src="${escapeHtml(mp3.url)}"></audio></div>`;
  }

  const spotifyLink = spotifyShow?.url
    ? `<p><a href="${escapeHtml(spotifyShow.url)}">前往 Spotify「AI 辯論所」節目頁</a></p>`
    : "";

  nodes.mediaGrid.innerHTML = `
    <article class="media-panel">
      <div class="media-panel-head">
        <span>YouTube</span>
        <strong>Podcast 影片版</strong>
      </div>
      ${youtubePanel}
    </article>
    <article class="media-panel podcast-panel">
      <div class="media-panel-head">
        <span>Podcast</span>
        <strong>Spotify 與網頁播放</strong>
      </div>
      ${podcastPanel}
      ${spotifyLink}
    </article>
  `;
}

function renderSegments(segments) {
  const debateSegments = segments
    .filter((segment) => segment.speaker_role !== "judge")
    .sort((a, b) => a.sort_order - b.sort_order);
  const judgeSegments = segments
    .filter((segment) => segment.speaker_role === "judge")
    .sort((a, b) => a.sort_order - b.sort_order);

  nodes.debateSections.innerHTML = debateSegments.map((segment) => `
    <article class="card ${roleClass(segment.speaker_role)}" data-segment-id="${escapeHtml(segment.round_key)}">
      <div class="card-head">
        <div>
          <span class="badge">${escapeHtml(roleLabel(segment))}</span>
          <h3>${escapeHtml(segment.title)}</h3>
        </div>
        <div class="card-actions">
          ${isLikableSegment(segment) ? `<button type="button" class="segment-like" data-segment-like data-segment-id="${escapeHtml(segment.round_key)}" disabled>登入後認同</button><span class="segment-like-count" data-segment-like-count>0 人認同</span>` : ""}
          ${segment.audio_url ? `<div class="audio-box"><span>段落語音</span><audio controls preload="metadata" src="${escapeHtml(segment.audio_url)}"></audio></div>` : ""}
        </div>
      </div>
      <div class="content">${renderMarkdownBlock(segment.content)}</div>
    </article>
  `).join("");

  nodes.judgeSection.innerHTML = judgeSegments.map((segment) => `
    <article class="card judge">
      <div class="card-head">
        <div>
          <span class="badge">${escapeHtml(roleLabel(segment))}</span>
          <h3>${escapeHtml(segment.title)}</h3>
        </div>
        ${segment.audio_url ? `<div class="audio-box"><span>裁判語音</span><audio controls preload="metadata" src="${escapeHtml(segment.audio_url)}"></audio></div>` : ""}
      </div>
      <div class="content">${renderMarkdownBlock(segment.content)}</div>
    </article>
  `).join("");
}

function setSegmentButtonState(button, liked) {
  button.textContent = activeSession ? (liked ? "已認同" : "認同這段") : "登入後認同";
  button.disabled = !activeSession;
}

function setAllSegmentButtonStates() {
  document.querySelectorAll("[data-segment-like]").forEach((button) => {
    setSegmentButtonState(button, Boolean(segmentLikeState.get(button.dataset.segmentId)?.liked));
  });
}

async function loadSegmentLikes() {
  const buttons = [...document.querySelectorAll("[data-segment-like]")];
  if (!buttons.length || !activeClient || !slug) return;

  const segmentIds = buttons.map((button) => button.dataset.segmentId);
  const { data, error } = await activeClient
    .from("debate_segment_likes")
    .select("segment_id, user_id")
    .eq("debate_id", slug)
    .in("segment_id", segmentIds);

  if (error) {
    buttons.forEach((button) => {
      button.textContent = "段落按讚尚未啟用";
      button.disabled = true;
    });
    return;
  }

  segmentLikeState.clear();
  segmentIds.forEach((id) => segmentLikeState.set(id, { count: 0, liked: false }));
  data?.forEach((row) => {
    const state = segmentLikeState.get(row.segment_id) || { count: 0, liked: false };
    state.count += 1;
    state.liked = state.liked || row.user_id === activeSession?.user?.id;
    segmentLikeState.set(row.segment_id, state);
  });

  buttons.forEach((button) => {
    const state = segmentLikeState.get(button.dataset.segmentId) || { count: 0, liked: false };
    const count = button.parentElement.querySelector("[data-segment-like-count]");
    if (count) count.textContent = `${state.count} 人認同`;
    setSegmentButtonState(button, state.liked);
  });
}

async function initSegmentLikes(client) {
  const buttons = [...document.querySelectorAll("[data-segment-like]")];
  if (!buttons.length) return;

  activeClient = client;
  activeSession = (await client.auth.getSession()).data.session;

  buttons.forEach((button) => {
    button.addEventListener("click", async () => {
      if (!activeSession) return;
      button.disabled = true;
      const state = segmentLikeState.get(button.dataset.segmentId) || { liked: false };
      const request = state.liked
        ? client
            .from("debate_segment_likes")
            .delete()
            .eq("debate_id", slug)
            .eq("segment_id", button.dataset.segmentId)
            .eq("user_id", activeSession.user.id)
        : client.from("debate_segment_likes").insert({
            debate_id: slug,
            segment_id: button.dataset.segmentId,
            user_id: activeSession.user.id,
          });

      await request;
      await loadSegmentLikes();
    });
  });

  client.auth.onAuthStateChange(async (_event, nextSession) => {
    activeSession = nextSession;
    setAllSegmentButtonStates();
    await loadSegmentLikes();
  });

  await loadSegmentLikes();
}

function renderScorecards(scorecards) {
  if (!scorecards.length || !nodes.judgeSection) return;
  const rows = scorecards
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((scorecard) => `
      <tr>
        <td>${escapeHtml(scorecard.criterion)}</td>
        <td>${escapeHtml(scorecard.affirmative_score)}</td>
        <td>${escapeHtml(scorecard.negative_score)}</td>
        <td>${escapeHtml(scorecard.comment)}</td>
      </tr>
    `).join("");
  nodes.judgeSection.insertAdjacentHTML("afterbegin", `
    <article class="card judge">
      <div class="card-head">
        <div>
          <span class="badge">裁判評分</span>
          <h3>評分總覽</h3>
        </div>
      </div>
      <div class="content">
        <div class="table-wrap">
          <table>
            <thead><tr><th>項目</th><th>正方</th><th>反方</th><th>說明</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
    </article>
  `);
}

function renderError(message) {
  nodes.title.textContent = "無法載入辯論";
  nodes.summary.textContent = message;
  nodes.mediaGrid.innerHTML = `<article class="portal-empty">${escapeHtml(message)}</article>`;
  nodes.debateSections.innerHTML = `<article class="portal-empty">${escapeHtml(message)}</article>`;
  nodes.judgeSection.innerHTML = "";
}

async function init() {
  if (!slug) {
    renderError("網址缺少 slug。");
    return;
  }

  try {
    const debate = await loadDebate();
    const segments = debate.debate_segments || [];
    const scorecards = debate.debate_scorecards || [];
    const media = debate.debate_media || [];

    renderHero(debate);
    renderMedia(media);
    renderSegments(segments);
    renderScorecards(scorecards);
    createSupabaseClient()
      .then((client) => initSegmentLikes(client))
      .catch(() => {});
  } catch {
    renderError("目前無法從資料庫讀取這篇辯論，或文章尚未發布。");
  }
}

init();
