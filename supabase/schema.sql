-- =====================================================================
-- Lueur — schéma de base de données (Supabase / PostgreSQL)
-- À coller dans Supabase > SQL Editor > New query > Run.
-- Peut être relancé sans danger (idempotent).
-- =====================================================================

-- ---------- Tables ----------
create table if not exists public.posts (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  pseudo      text check (pseudo is null or char_length(pseudo) between 1 and 30),
  category    text not null default 'autre'
              check (category in ('deuil','rupture','solitude','depression','anxiete','maladie','trauma','effondrement','autre')),
  content     text not null check (char_length(content) between 3 and 1500),
  hugs        integer not null default 0,
  reports     integer not null default 0,
  hidden      boolean not null default false
);
create index if not exists posts_feed_idx on public.posts (created_at desc) where hidden = false;

create table if not exists public.replies (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  created_at  timestamptz not null default now(),
  content     text not null check (char_length(content) between 2 and 500),
  reports     integer not null default 0,
  hidden      boolean not null default false
);
create index if not exists replies_post_idx on public.replies (post_id, created_at);

create table if not exists public.candles (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 1 and 60),
  message     text check (message is null or char_length(message) <= 200),
  reports     integer not null default 0,
  hidden      boolean not null default false
);
create index if not exists candles_feed_idx on public.candles (created_at desc) where hidden = false;

-- Journal anti-spam (inaccessible au public : RLS activé, aucune policy)
create table if not exists public.rate_events (
  ip_hash text not null,
  kind    text not null,
  at      timestamptz not null default now()
);
create index if not exists rate_events_idx on public.rate_events (ip_hash, kind, at);

-- ---------- Sécurité : Row Level Security ----------
alter table public.posts       enable row level security;
alter table public.replies     enable row level security;
alter table public.candles     enable row level security;
alter table public.rate_events enable row level security;

drop policy if exists "lecture posts visibles" on public.posts;
create policy "lecture posts visibles" on public.posts
  for select using (hidden = false);
drop policy if exists "ajout posts" on public.posts;
create policy "ajout posts" on public.posts
  for insert with check (hidden = false and reports = 0 and hugs = 0);

drop policy if exists "lecture replies visibles" on public.replies;
create policy "lecture replies visibles" on public.replies
  for select using (hidden = false);
drop policy if exists "ajout replies" on public.replies;
create policy "ajout replies" on public.replies
  for insert with check (
    hidden = false and reports = 0
    and exists (select 1 from public.posts p where p.id = post_id and p.hidden = false)
  );

drop policy if exists "lecture bougies visibles" on public.candles;
create policy "lecture bougies visibles" on public.candles
  for select using (hidden = false);
drop policy if exists "ajout bougies" on public.candles;
create policy "ajout bougies" on public.candles
  for insert with check (hidden = false and reports = 0);

-- Aucune policy update/delete : le public ne peut ni modifier ni supprimer.

-- ---------- Anti-spam : max 5 publications / 10 min par adresse IP ----------
create or replace function public.enforce_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  headers json := nullif(current_setting('request.headers', true), '')::json;
  ip      text := coalesce(trim(split_part(headers->>'x-forwarded-for', ',', 1)), 'inconnu');
  h       text := md5(ip || ':lueur');      -- l'IP n'est jamais stockée en clair
  n       int;
begin
  select count(*) into n from rate_events
   where ip_hash = h and kind = tg_table_name and at > now() - interval '10 minutes';
  if n >= 5 then
    raise exception 'Tu as beaucoup écrit en peu de temps. Prends une pause, respire, et reviens dans quelques minutes.';
  end if;
  insert into rate_events (ip_hash, kind) values (h, tg_table_name);
  delete from rate_events where at < now() - interval '1 day';
  return new;
end $$;

drop trigger if exists posts_rate   on public.posts;
drop trigger if exists replies_rate on public.replies;
drop trigger if exists candles_rate on public.candles;
create trigger posts_rate   before insert on public.posts   for each row execute function public.enforce_rate_limit();
create trigger replies_rate before insert on public.replies for each row execute function public.enforce_rate_limit();
create trigger candles_rate before insert on public.candles for each row execute function public.enforce_rate_limit();

-- ---------- Actions publiques contrôlées ----------
-- Envoyer un 🤍 : la seule modification autorisée sur un message
create or replace function public.give_hug(p_id uuid)
returns integer language sql security definer set search_path = public as $$
  update posts set hugs = hugs + 1 where id = p_id and hidden = false returning hugs;
$$;

-- Signaler : masqué automatiquement à 3 signalements
create or replace function public.report_item(p_kind text, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_kind = 'posts' then
    update posts   set reports = reports + 1, hidden = (reports + 1 >= 3) where id = p_id;
  elsif p_kind = 'replies' then
    update replies set reports = reports + 1, hidden = (reports + 1 >= 3) where id = p_id;
  elsif p_kind = 'candles' then
    update candles set reports = reports + 1, hidden = (reports + 1 >= 3) where id = p_id;
  end if;
end $$;

revoke all on function public.give_hug(uuid)          from public;
revoke all on function public.report_item(text, uuid) from public;
revoke all on function public.enforce_rate_limit()    from public, anon, authenticated;
grant execute on function public.give_hug(uuid)          to anon, authenticated;
grant execute on function public.report_item(text, uuid) to anon, authenticated;

-- ---------- Modération (à lancer toi-même dans le SQL Editor) ----------
-- Voir les contenus signalés :
--   select * from posts   where reports > 0 order by reports desc;
--   select * from replies where reports > 0 order by reports desc;
-- Ré-afficher un message signalé à tort :
--   update posts set hidden = false, reports = 0 where id = '...';
-- Supprimer définitivement :
--   delete from posts where id = '...';
