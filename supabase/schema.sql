-- =====================================================================
-- Un pas après l'autre — schéma v2 (Supabase / PostgreSQL)
-- Idempotent : peut être relancé sans perdre de données.
-- Principe : le public LIT uniquement les contenus visibles (RLS).
-- Toutes les ÉCRITURES publiques passent par l'Edge Function "api"
-- (clé service_role côté serveur) : modération, anti-spam, codes secrets.
-- Les administrateurs (Supabase Auth + table admins) modèrent via RPC.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Tables ----------
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  kind          text not null default 'story' check (kind in ('story','hope')),
  title         text not null check (char_length(title) between 3 and 120),
  body          text not null check (char_length(body) between 10 and 6000),
  hope          jsonb,                       -- champs structurés des histoires d'espoir
  category      text not null default 'autre',
  space         text,                        -- espace thématique (rupture, deuil, solitude, famille, reconstruction)
  pseudo        text not null check (char_length(pseudo) between 2 and 40),
  lang          text not null default 'fr',
  allow_replies boolean not null default true,
  status        text not null default 'visible' check (status in ('visible','pending','hidden','rejected')),
  flag_reason   text,
  priority      smallint not null default 0,  -- 0 normal · 1 à vérifier · 2 important · 3 urgent
  reply_count   integer not null default 0,
  r_courage     integer not null default 0,
  r_avec        integer not null default 0,
  r_ecoute      integer not null default 0,
  r_meilleur    integer not null default 0,
  r_pense       integer not null default 0,
  report_count  integer not null default 0
);
create index if not exists posts_feed_idx on public.posts (status, created_at desc);
create index if not exists posts_space_idx on public.posts (space, status, created_at desc);

-- Code de gestion : seul son empreinte SHA-256 est stockée, dans une table illisible par le public
create table if not exists public.post_secrets (
  post_id     uuid primary key references public.posts(id) on delete cascade,
  code_hash   text not null unique
);

create table if not exists public.replies (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  post_id      uuid not null references public.posts(id) on delete cascade,
  parent_id    uuid references public.replies(id) on delete cascade,
  body         text not null check (char_length(body) between 2 and 2000),
  pseudo       text not null check (char_length(pseudo) between 2 and 40),
  status       text not null default 'visible' check (status in ('visible','pending','hidden','rejected')),
  flag_reason  text,
  priority     smallint not null default 0,
  report_count integer not null default 0
);
create index if not exists replies_post_idx on public.replies (post_id, created_at);

create table if not exists public.encouragements (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  body         text not null check (char_length(body) between 5 and 300),
  category     text,
  lang         text not null default 'fr',
  thanks       integer not null default 0,
  status       text not null default 'visible' check (status in ('visible','pending','hidden','rejected')),
  flag_reason  text,
  priority     smallint not null default 0,
  report_count integer not null default 0
);

create table if not exists public.candles (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  name         text not null check (char_length(name) between 1 and 60),
  message      text check (message is null or char_length(message) <= 200),
  status       text not null default 'visible' check (status in ('visible','pending','hidden','rejected')),
  flag_reason  text,
  report_count integer not null default 0
);

create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  target_type  text not null check (target_type in ('post','reply','encouragement','candle')),
  target_id    uuid not null,
  reason       text not null,
  details      text check (details is null or char_length(details) <= 500),
  priority     smallint not null default 1,
  status       text not null default 'open' check (status in ('open','done'))
);
create index if not exists reports_open_idx on public.reports (status, priority desc, created_at);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table if not exists public.moderation_log (
  id           bigserial primary key,
  created_at   timestamptz not null default now(),
  admin_id     uuid,
  action       text not null,
  target_type  text not null,
  target_id    uuid,
  note         text
);

-- Compteurs anonymes (aucune donnée personnelle)
create table if not exists public.counters (
  key   text primary key,
  value bigint not null default 0
);

-- Anti-spam : empreinte d'IP salée, jamais l'IP en clair ; purgé après 1 jour
create table if not exists public.rate_events (
  ip_hash text not null,
  kind    text not null,
  at      timestamptz not null default now()
);
create index if not exists rate_events_idx on public.rate_events (ip_hash, kind, at);

-- ---------- Fonctions utilitaires ----------
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;

-- Nombre de réponses visibles, tenu à jour automatiquement
create or replace function public.refresh_reply_count() returns trigger
language plpgsql security definer set search_path = public as $$
declare pid uuid := coalesce(new.post_id, old.post_id);
begin
  update posts set reply_count = (select count(*) from replies where post_id = pid and status = 'visible') where id = pid;
  return null;
end $$;
drop trigger if exists replies_count on public.replies;
create trigger replies_count after insert or update of status or delete on public.replies
  for each row execute function public.refresh_reply_count();

-- ---------- Row Level Security ----------
alter table public.posts          enable row level security;
alter table public.post_secrets   enable row level security;
alter table public.replies        enable row level security;
alter table public.encouragements enable row level security;
alter table public.candles        enable row level security;
alter table public.reports        enable row level security;
alter table public.admins         enable row level security;
alter table public.moderation_log enable row level security;
alter table public.counters       enable row level security;
alter table public.rate_events    enable row level security;

-- Lecture publique : uniquement le visible. Lecture admin : tout.
drop policy if exists "posts lecture" on public.posts;
create policy "posts lecture" on public.posts for select using (status = 'visible' or public.is_admin());
create or replace function public.post_is_visible(p_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from posts where id = p_id and status = 'visible');
$$;
grant execute on function public.post_is_visible(uuid) to anon, authenticated;
drop policy if exists "replies lecture" on public.replies;
create policy "replies lecture" on public.replies for select
  using ((status = 'visible' and public.post_is_visible(post_id)) or public.is_admin());
drop policy if exists "encouragements lecture" on public.encouragements;
create policy "encouragements lecture" on public.encouragements for select using (status = 'visible' or public.is_admin());
drop policy if exists "candles lecture" on public.candles;
create policy "candles lecture" on public.candles for select using (status = 'visible' or public.is_admin());
drop policy if exists "reports admin" on public.reports;
create policy "reports admin" on public.reports for select using (public.is_admin());
drop policy if exists "log admin" on public.moderation_log;
create policy "log admin" on public.moderation_log for select using (public.is_admin());
drop policy if exists "counters admin" on public.counters;
create policy "counters admin" on public.counters for select using (public.is_admin());
drop policy if exists "admins self" on public.admins;
create policy "admins self" on public.admins for select using (user_id = auth.uid());
-- post_secrets et rate_events : aucune policy = inaccessibles au public comme aux admins.
-- Aucune policy insert/update/delete : le public ne peut rien écrire directement.

-- Les colonnes internes de modération ne sont pas exposées au public
revoke select on public.posts, public.replies, public.encouragements, public.candles from anon;
grant select (id, created_at, updated_at, kind, title, body, hope, category, space, pseudo, lang, allow_replies,
              reply_count, r_courage, r_avec, r_ecoute, r_meilleur, r_pense) on public.posts to anon;
grant select (id, created_at, post_id, parent_id, body, pseudo) on public.replies to anon;
grant select (id, created_at, body, category, lang, thanks) on public.encouragements to anon;
grant select (id, created_at, name, message) on public.candles to anon;

-- ---------- Modération (administrateurs uniquement) ----------
create or replace function public.admin_moderate(p_type text, p_id uuid, p_action text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare new_status text;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  if p_action not in ('approve','hide','reject','delete','resolve') then raise exception 'bad action'; end if;
  new_status := case p_action when 'approve' then 'visible' when 'hide' then 'hidden' when 'reject' then 'rejected' else null end;

  if p_type = 'report' then
    update reports set status = 'done' where id = p_id;
  elsif p_action = 'delete' then
    if p_type = 'post' then delete from posts where id = p_id;
    elsif p_type = 'reply' then delete from replies where id = p_id;
    elsif p_type = 'encouragement' then delete from encouragements where id = p_id;
    elsif p_type = 'candle' then delete from candles where id = p_id; end if;
  elsif new_status is not null then
    if p_type = 'post' then update posts set status = new_status, priority = 0, report_count = case when new_status = 'visible' then 0 else report_count end where id = p_id;
    elsif p_type = 'reply' then update replies set status = new_status, priority = 0, report_count = case when new_status = 'visible' then 0 else report_count end where id = p_id;
    elsif p_type = 'encouragement' then update encouragements set status = new_status, priority = 0 where id = p_id;
    elsif p_type = 'candle' then update candles set status = new_status where id = p_id; end if;
    -- les signalements liés sont considérés comme traités
    update reports set status = 'done' where target_id = p_id and status = 'open';
  end if;

  insert into moderation_log (admin_id, action, target_type, target_id, note) values (auth.uid(), p_action, p_type, p_id, p_note);
end $$;

create or replace function public.admin_stats() returns json
language plpgsql stable security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  return json_build_object(
    'posts', (select count(*) from posts where status = 'visible'),
    'posts_pending', (select count(*) from posts where status = 'pending'),
    'replies', (select count(*) from replies where status = 'visible'),
    'encouragements', (select count(*) from encouragements where status = 'visible'),
    'reports_open', (select count(*) from reports where status = 'open'),
    'reports_total', (select count(*) from reports),
    'avg_moderation_hours', (select round(extract(epoch from avg(l.created_at - r.created_at)) / 3600.0, 1)
                               from reports r join moderation_log l on l.target_id = r.target_id where r.status = 'done'),
    'by_category', (select coalesce(json_object_agg(category, n), '{}'::json) from (select category, count(*) n from posts where status = 'visible' group by category) c),
    'counters', (select coalesce(json_object_agg(key, value), '{}'::json) from counters)
  );
end $$;

revoke all on function public.admin_moderate(text, uuid, text, text) from public, anon;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_moderate(text, uuid, text, text) to authenticated;
grant execute on function public.admin_stats() to authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- Compteur atomique (appelé par l'Edge Function uniquement)
create or replace function public.bump_counter(p_key text, p_by int default 1) returns bigint
language sql security definer set search_path = public as $$
  insert into counters (key, value) values (p_key, p_by)
  on conflict (key) do update set value = counters.value + excluded.value
  returning value;
$$;
create or replace function public.bump_column(p_table text, p_id uuid, p_column text) returns integer
language plpgsql security definer set search_path = public as $$
declare v integer;
begin
  if p_table = 'posts' and p_column in ('r_courage','r_avec','r_ecoute','r_meilleur','r_pense') then
    execute format('update posts set %I = %I + 1 where id = $1 and status = ''visible'' returning %I', p_column, p_column, p_column) into v using p_id;
  elsif p_table = 'encouragements' and p_column = 'thanks' then
    update encouragements set thanks = thanks + 1 where id = p_id and status = 'visible' returning thanks into v;
  end if;
  return v;
end $$;
revoke all on function public.bump_counter(text, int) from public, anon, authenticated;
revoke all on function public.bump_column(text, uuid, text) from public, anon, authenticated;

-- =====================================================================
-- Après avoir créé ton compte administrateur (Authentication > Users),
-- donne-lui les droits :  insert into public.admins (user_id)
--   select id from auth.users where email = 'ton@email';
-- =====================================================================
