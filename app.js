const audioMap = {
  "正方申論": "audio/positive-opening.wav",
  "反方申論": "audio/negative-opening.wav",
  "正方駁論": "audio/positive-rebuttal.wav",
  "反方駁論": "audio/negative-rebuttal.wav",
  "反方結辯": "audio/negative-closing.wav",
  "正方結辯": "audio/positive-closing.wav",
  "Claude 評審結果": "audio/judge.wav"
};

const roleMap = {
  "正方申論": ["positive", "正方 Codex"],
  "正方駁論": ["positive", "正方 Codex"],
  "正方結辯": ["positive", "正方 Codex"],
  "反方申論": ["negative", "反方 Gemini"],
  "反方駁論": ["negative", "反方 Gemini"],
  "反方結辯": ["negative", "反方 Gemini"],
  "Claude 評審結果": ["judge", "裁判 Claude"]
};

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
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
  const lines = markdown.split(/\r?\n/);
  const html = [];
  let paragraph = [];
  let table = [];
  let quote = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };
  const flushTable = () => {
    if (table.length) {
      html.push(renderTable(table));
      table = [];
    }
  };
  const flushQuote = () => {
    if (quote.length) {
      html.push(`<blockquote>${quote.map((line) => `<p>${inlineMarkdown(line)}</p>`).join("")}</blockquote>`);
      quote = [];
    }
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
    if (line === "---") {
      flushParagraph();
      flushTable();
      flushQuote();
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph();
  flushTable();
  flushQuote();
  return html.join("");
}

function parseSections(markdown) {
  const sections = [];
  const lines = markdown.split(/\r?\n/);
  let current = null;

  for (const line of lines) {
    const match = line.match(/^##\s+(.+)$/);
    if (match) {
      if (current) sections.push(current);
      current = { title: match[1], body: [] };
    } else if (current) {
      current.body.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

function cardFor(section) {
  const [roleClass, roleLabel] = roleMap[section.title] || ["judge", "紀錄"];
  const audio = audioMap[section.title];
  const article = document.createElement("article");
  article.className = `card ${roleClass}`;
  article.innerHTML = `
    <div class="card-head">
      <div>
        <span class="badge">${roleLabel}</span>
        <h3>${escapeHtml(section.title)}</h3>
      </div>
      ${audio ? `<audio controls preload="metadata" src="${audio}"></audio>` : ""}
    </div>
    <div class="content">${renderMarkdownBlock(section.body.join("\n"))}</div>
  `;
  return article;
}

fetch("debate.md")
  .then((response) => response.text())
  .then((markdown) => {
    const sections = parseSections(markdown);
    const debate = document.querySelector("#debate-sections");
    const judge = document.querySelector("#judge-section");
    sections.forEach((section) => {
      const card = cardFor(section);
      if (section.title.includes("Claude")) {
        judge.appendChild(card);
      } else {
        debate.appendChild(card);
      }
    });
  })
  .catch(() => {
    document.querySelector("#debate-sections").innerHTML = `<article class="card"><p>無法載入 debate.md。</p></article>`;
  });
