import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const now = process.env.PUBLISH_NOW ? new Date(process.env.PUBLISH_NOW) : new Date();

const publicFiles = [
  "index.html",
  "styles.css",
  "portal.js",
  "site-auth.js",
  "engagement.js",
  "supabase-config.js"
];

function isPublishable(debate) {
  if (debate.status === "draft") return false;
  if (debate.status === "published") return true;
  if (debate.status !== "scheduled") return false;
  return new Date(debate.publishAt) <= now;
}

function publicDebate(debate) {
  const {
    sourceDir,
    status,
    ...safeDebate
  } = debate;
  return safeDebate;
}

async function copyIfExists(from, to) {
  if (!existsSync(from)) return false;
  await cp(from, to, {
    recursive: true,
    filter: (source) => {
      const relative = path.relative(from, source).replaceAll(path.sep, "/");
      return !(
        relative === "video/output" ||
        relative.startsWith("video/output/") ||
        relative === "podcast/caption-segments" ||
        relative.startsWith("podcast/caption-segments/")
      );
    }
  });
  return true;
}

async function main() {
  await rm(dist, { recursive: true, force: true });
  await mkdir(dist, { recursive: true });

  for (const file of publicFiles) {
    await cp(path.join(root, file), path.join(dist, file));
  }

  const source = JSON.parse(
    await readFile(path.join(root, "site-data", "debates.json"), "utf8")
  );

  const published = source
    .filter(isPublishable)
    .sort((a, b) => new Date(b.publishAt) - new Date(a.publishAt));

  await mkdir(path.join(dist, "debates"), { recursive: true });

  for (const debate of published) {
    const sourceDir = path.join(root, debate.sourceDir);
    const targetDir = path.join(dist, "debates", debate.slug);
    const copied = await copyIfExists(sourceDir, targetDir);
    if (!copied) {
      throw new Error(`Missing debate source directory: ${debate.sourceDir}`);
    }
  }

  await writeFile(
    path.join(dist, "debates.json"),
    `${JSON.stringify(published.map(publicDebate), null, 2)}\n`
  );

  await writeFile(
    path.join(dist, ".nojekyll"),
    ""
  );

  console.log(`Built ${published.length} published debate(s) into dist at ${now.toISOString()}.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
