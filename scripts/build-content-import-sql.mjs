import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const seedPath = path.join(root, "migration", "debates.seed.json");
const outputPath = path.join(root, "migration", "import-content-seed.sql");

function dollarQuote(value, tag) {
  if (value.includes(`$${tag}$`)) {
    throw new Error(`Seed contains reserved dollar quote tag ${tag}`);
  }
  return `$${tag}$${value}$${tag}$`;
}

const seedJson = await readFile(seedPath, "utf8");
JSON.parse(seedJson);

const sql = `-- Import AI Debate Archive content seed into Supabase.
-- Run supabase/content-schema.sql before this file.
-- This import is idempotent for debates listed in migration/debates.seed.json:
-- debate rows are upserted by slug, while segments, scorecards, and media rows
-- for those debates are rebuilt from the seed.

begin;

create temp table content_seed_payload (
  data jsonb not null
);

insert into content_seed_payload (data)
values (${dollarQuote(seedJson.trim(), "CONTENT_SEED")}::jsonb);

create temp table content_seed_debates (
  slug text primary key,
  id uuid not null
);

with payload as (
  select jsonb_array_elements(data) as item
  from content_seed_payload
),
upserted as (
  insert into public.debates (
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
    winner,
    winner_label,
    affirmative_score,
    negative_score,
    score_total,
    source_dir,
    source_markdown_url,
    updated_at
  )
  select
    item #>> '{debate,slug}',
    item #>> '{debate,title}',
    item #>> '{debate,summary}',
    item #>> '{debate,category}',
    item #>> '{debate,status}',
    nullif(item #>> '{debate,publish_at}', '')::timestamptz,
    item #>> '{debate,cover_class}',
    item #>> '{debate,affirmative_model}',
    item #>> '{debate,negative_model}',
    item #>> '{debate,judge_model}',
    item #>> '{debate,winner}',
    item #>> '{debate,winner_label}',
    nullif(item #>> '{debate,affirmative_score}', '')::numeric,
    nullif(item #>> '{debate,negative_score}', '')::numeric,
    nullif(item #>> '{debate,score_total}', '')::numeric,
    item #>> '{debate,source_dir}',
    item #>> '{debate,source_markdown_url}',
    now()
  from payload
  on conflict (slug) do update
  set
    title = excluded.title,
    summary = excluded.summary,
    category = excluded.category,
    status = excluded.status,
    publish_at = excluded.publish_at,
    cover_class = excluded.cover_class,
    affirmative_model = excluded.affirmative_model,
    negative_model = excluded.negative_model,
    judge_model = excluded.judge_model,
    winner = excluded.winner,
    winner_label = excluded.winner_label,
    affirmative_score = excluded.affirmative_score,
    negative_score = excluded.negative_score,
    score_total = excluded.score_total,
    source_dir = excluded.source_dir,
    source_markdown_url = excluded.source_markdown_url,
    updated_at = now()
  returning slug, id
)
insert into content_seed_debates (slug, id)
select slug, id
from upserted;

delete from public.debate_segments
where debate_id in (select id from content_seed_debates);

delete from public.debate_scorecards
where debate_id in (select id from content_seed_debates);

delete from public.debate_media
where debate_id in (select id from content_seed_debates);

with payload as (
  select jsonb_array_elements(data) as item
  from content_seed_payload
),
segments as (
  select
    debates.id as debate_id,
    segment
  from payload
  join content_seed_debates debates
    on debates.slug = payload.item #>> '{debate,slug}'
  cross join lateral jsonb_array_elements(payload.item -> 'segments') as segment
)
insert into public.debate_segments (
  debate_id,
  round_key,
  speaker_role,
  speaker_name,
  title,
  content,
  sort_order,
  audio_url,
  updated_at
)
select
  debate_id,
  segment ->> 'round_key',
  segment ->> 'speaker_role',
  segment ->> 'speaker_name',
  segment ->> 'title',
  segment ->> 'content',
  (segment ->> 'sort_order')::integer,
  nullif(segment ->> 'audio_url', ''),
  now()
from segments;

with payload as (
  select jsonb_array_elements(data) as item
  from content_seed_payload
),
scorecards as (
  select
    debates.id as debate_id,
    scorecard
  from payload
  join content_seed_debates debates
    on debates.slug = payload.item #>> '{debate,slug}'
  cross join lateral jsonb_array_elements(payload.item -> 'scorecards') as scorecard
)
insert into public.debate_scorecards (
  debate_id,
  criterion,
  affirmative_score,
  negative_score,
  comment,
  sort_order,
  updated_at
)
select
  debate_id,
  scorecard ->> 'criterion',
  nullif(scorecard ->> 'affirmative_score', '')::numeric,
  nullif(scorecard ->> 'negative_score', '')::numeric,
  scorecard ->> 'comment',
  (scorecard ->> 'sort_order')::integer,
  now()
from scorecards;

with payload as (
  select jsonb_array_elements(data) as item
  from content_seed_payload
),
media_rows as (
  select
    debates.id as debate_id,
    media
  from payload
  join content_seed_debates debates
    on debates.slug = payload.item #>> '{debate,slug}'
  cross join lateral jsonb_array_elements(payload.item -> 'media') as media
)
insert into public.debate_media (
  debate_id,
  media_type,
  title,
  url,
  embed_url,
  status,
  sort_order,
  updated_at
)
select
  debate_id,
  media ->> 'media_type',
  media ->> 'title',
  nullif(media ->> 'url', ''),
  nullif(media ->> 'embed_url', ''),
  media ->> 'status',
  (media ->> 'sort_order')::integer,
  now()
from media_rows;

commit;

select
  debates.slug,
  debates.status,
  count(distinct debate_segments.id) as segment_count,
  count(distinct debate_scorecards.id) as scorecard_count,
  count(distinct debate_media.id) as media_count
from public.debates
left join public.debate_segments on debate_segments.debate_id = debates.id
left join public.debate_scorecards on debate_scorecards.debate_id = debates.id
left join public.debate_media on debate_media.debate_id = debates.id
where debates.slug in (
  select item #>> '{debate,slug}'
  from content_seed_payload,
    lateral jsonb_array_elements(content_seed_payload.data) as item
)
group by debates.slug, debates.status
order by debates.slug;
`;

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, sql, "utf8");

console.log(`Wrote ${path.relative(root, outputPath)}`);
