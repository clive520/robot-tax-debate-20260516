import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const siteOrigin = "https://clive520.github.io/robot-tax-debate-20260516";
const spotifyShowUrl = "https://open.spotify.com/show/033i8synWg22dgCqwNGCAX";

const roundMap = new Map([
  ["正方申論", ["affirmative_opening", "affirmative", 1, "positive-opening.mp3"]],
  ["反方申論", ["negative_opening", "negative", 2, "negative-opening.mp3"]],
  ["正方駁論", ["affirmative_rebuttal", "affirmative", 3, "positive-rebuttal.mp3"]],
  ["反方駁論", ["negative_rebuttal", "negative", 4, "negative-rebuttal.mp3"]],
  ["反方結辯", ["negative_closing", "negative", 5, "negative-closing.mp3"]],
  ["正方結辯", ["affirmative_closing", "affirmative", 6, "positive-closing.mp3"]],
]);

function normalizeWinner(label = "") {
  if (label.includes("正方")) return "affirmative";
  if (label.includes("反方")) return "negative";
  if (label.includes("平")) return "tie";
  return "";
}

function parseMarkdownSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = null;

  for (const line of lines) {
    const heading = line.match(/^##\s+(.+?)\s*$/);
    if (heading) {
      if (current) sections.push(current);
      current = { title: heading[1].trim(), lines: [] };
      continue;
    }
    if (current) current.lines.push(line);
  }
  if (current) sections.push(current);
  return sections.map((section) => ({
    title: section.title,
    content: section.lines.join("\n").trim(),
  }));
}

function buildSegments(debate, markdown) {
  const sections = parseMarkdownSections(markdown);
  const segments = [];

  for (const section of sections) {
    if (roundMap.has(section.title)) {
      const [roundKey, speakerRole, sortOrder, audioFile] = roundMap.get(section.title);
      const speakerName =
        speakerRole === "affirmative"
          ? debate.affirmative
          : speakerRole === "negative"
            ? debate.negative
            : debate.judge;
      segments.push({
        round_key: roundKey,
        speaker_role: speakerRole,
        speaker_name: speakerName,
        title: section.title,
        content: section.content,
        sort_order: sortOrder,
        audio_url: `${siteOrigin}/${debate.sourceDir}/audio/${audioFile}`,
      });
    } else if (section.title.includes("評審結果") || section.title.includes("評審") || section.title.includes("裁判")) {
      segments.push({
        round_key: "judge_decision",
        speaker_role: "judge",
        speaker_name: debate.judge,
        title: section.title,
        content: section.content,
        sort_order: 7,
        audio_url: `${siteOrigin}/${debate.sourceDir}/audio/judge.mp3`,
      });
    }
  }

  return segments.sort((a, b) => a.sort_order - b.sort_order);
}

function youtubeEmbedFromUrl(url) {
  if (!url) return "";
  const shortMatch = url.match(/youtu\.be\/([^?&#/]+)/);
  const watchMatch = url.match(/[?&]v=([^?&#/]+)/);
  const embedMatch = url.match(/youtube\.com\/embed\/([^?&#/]+)/);
  const id = shortMatch?.[1] || watchMatch?.[1] || embedMatch?.[1];
  return id ? `https://www.youtube.com/embed/${id}` : "";
}

async function readOptional(relativePath) {
  try {
    return await readFile(path.join(root, relativePath), "utf8");
  } catch {
    return "";
  }
}

function firstMatch(text, pattern) {
  return text.match(pattern)?.[1]?.trim() || "";
}

async function buildMedia(debate) {
  const indexHtml = await readOptional(`${debate.sourceDir}/index.html`);
  const episodeNotes = await readOptional(`${debate.sourceDir}/publishing/episode-notes.md`);
  const youtubeUrl =
    firstMatch(episodeNotes, /YouTube URL：`([^`]+)`/) ||
    firstMatch(indexHtml, /https:\/\/youtu\.be\/[^"'`\s<]+/) ||
    "";
  const youtubeEmbed =
    firstMatch(episodeNotes, /YouTube Embed URL：`([^`]+)`/) ||
    firstMatch(indexHtml, /src="(https:\/\/www\.youtube\.com\/embed\/[^"]+)"/) ||
    youtubeEmbedFromUrl(youtubeUrl);

  const media = [
    {
      media_type: "spotify_show",
      title: "AI 辯論所 Spotify 節目頁",
      url: spotifyShowUrl,
      embed_url: "",
      status: "available",
      sort_order: 10,
    },
    {
      media_type: "mp3",
      title: `${debate.title} Podcast 音訊`,
      url: `${siteOrigin}/${debate.sourceDir}/podcast/debate-podcast.mp3`,
      embed_url: "",
      status: "available",
      sort_order: 20,
    },
    {
      media_type: "srt",
      title: `${debate.title} 字幕`,
      url: `${siteOrigin}/${debate.sourceDir}/video/output/debate-video.srt`,
      embed_url: "",
      status: "pending",
      sort_order: 30,
    },
  ];

  if (youtubeEmbed || youtubeUrl) {
    media.unshift({
      media_type: "youtube",
      title: `${debate.title} YouTube 影片`,
      url: youtubeUrl || youtubeEmbed,
      embed_url: youtubeEmbed,
      status: "available",
      sort_order: 1,
    });
  }

  return media;
}

function buildScorecards(debate) {
  return [
    {
      criterion: "總分",
      affirmative_score: Number(debate.affirmativeScore || 0),
      negative_score: Number(debate.negativeScore || 0),
      comment: `滿分 ${debate.scoreTotal || ""}`,
      sort_order: 1,
    },
  ];
}

const debates = JSON.parse(await readFile(path.join(root, "site-data", "debates.json"), "utf8"));
const seed = [];

for (const debate of debates) {
  const markdown = await readFile(path.join(root, debate.sourceDir, "debate.md"), "utf8");
  seed.push({
    debate: {
      slug: debate.slug,
      title: debate.title,
      summary: debate.summary,
      category: debate.category,
      status: debate.status,
      publish_at: debate.publishAt,
      cover_class: debate.coverClass || "",
      affirmative_model: debate.affirmative,
      negative_model: debate.negative,
      judge_model: debate.judge,
      winner: normalizeWinner(debate.winner),
      winner_label: debate.winner,
      affirmative_score: Number(debate.affirmativeScore || 0),
      negative_score: Number(debate.negativeScore || 0),
      score_total: Number(debate.scoreTotal || 0),
      source_dir: debate.sourceDir,
      source_markdown_url: `${siteOrigin}/${debate.sourceDir}/debate.md`,
    },
    segments: buildSegments(debate, markdown),
    scorecards: buildScorecards(debate),
    media: await buildMedia(debate),
  });
}

await mkdir(path.join(root, "migration"), { recursive: true });
await writeFile(
  path.join(root, "migration", "debates.seed.json"),
  `${JSON.stringify(seed, null, 2)}\n`,
  "utf8",
);

console.log(`Wrote migration/debates.seed.json with ${seed.length} debate(s).`);
