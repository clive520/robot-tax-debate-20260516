-- Normalize debate media rows after admin editing.

with ranked_media as (
  select
    id,
    row_number() over (
      partition by debate_id, media_type
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as keep_rank
  from public.debate_media
)
delete from public.debate_media
using ranked_media
where debate_media.id = ranked_media.id
  and ranked_media.keep_rank > 1;

update public.debate_media
set
  embed_url = case
    when media_type = 'spotify_episode' and coalesce(embed_url, '') = '' and url ~ 'open\.spotify\.com/episode/[^?/#]+'
      then regexp_replace(url, '^.*open\.spotify\.com/episode/([^?/#]+).*$','https://open.spotify.com/embed/episode/\1')
    when media_type = 'spotify_show' and coalesce(embed_url, '') = '' and url ~ 'open\.spotify\.com/show/[^?/#]+'
      then regexp_replace(url, '^.*open\.spotify\.com/show/([^?/#]+).*$','https://open.spotify.com/embed/show/\1')
    when media_type = 'youtube' and coalesce(embed_url, '') = '' and url ~ 'youtu\.be/[^?/#]+'
      then regexp_replace(url, '^.*youtu\.be/([^?/#]+).*$','https://www.youtube.com/embed/\1')
    when media_type = 'youtube' and coalesce(embed_url, '') = '' and url ~ 'youtube\.com/watch\?'
      then regexp_replace(url, '^.*[?&]v=([^?&#/]+).*$','https://www.youtube.com/embed/\1')
    else embed_url
  end,
  status = case
    when coalesce(url, embed_url, '') <> '' and status = 'pending' then 'available'
    else status
  end,
  updated_at = now()
where media_type in ('spotify_episode', 'spotify_show', 'youtube');

create unique index if not exists debate_media_debate_type_unique
  on public.debate_media (debate_id, media_type);

