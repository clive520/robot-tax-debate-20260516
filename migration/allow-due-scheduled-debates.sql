drop policy if exists "Public can read published debates" on public.debates;
create policy "Public can read published debates"
  on public.debates
  for select
  using (
    status in ('published', 'scheduled')
    and (publish_at is null or publish_at <= now())
  );

drop policy if exists "Public can read published debate segments" on public.debate_segments;
create policy "Public can read published debate segments"
  on public.debate_segments
  for select
  using (
    exists (
      select 1
      from public.debates
      where debates.id = debate_segments.debate_id
        and debates.status in ('published', 'scheduled')
        and (debates.publish_at is null or debates.publish_at <= now())
    )
  );

drop policy if exists "Public can read published scorecards" on public.debate_scorecards;
create policy "Public can read published scorecards"
  on public.debate_scorecards
  for select
  using (
    exists (
      select 1
      from public.debates
      where debates.id = debate_scorecards.debate_id
        and debates.status in ('published', 'scheduled')
        and (debates.publish_at is null or debates.publish_at <= now())
    )
  );

drop policy if exists "Public can read published media" on public.debate_media;
create policy "Public can read published media"
  on public.debate_media
  for select
  using (
    status = 'available'
    and exists (
      select 1
      from public.debates
      where debates.id = debate_media.debate_id
        and debates.status in ('published', 'scheduled')
        and (debates.publish_at is null or debates.publish_at <= now())
    )
  );
