const debateList = document.querySelector("[data-debate-list]");
const topicCount = document.querySelector("[data-topic-count]");
const latestLink = document.querySelector("[data-latest-link]");

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
