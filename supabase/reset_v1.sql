-- À exécuter UNE SEULE FOIS, avant schema.sql, pour retirer les tables de la v1 (vides).
-- ATTENTION : supprime définitivement les données de la v1.
drop table if exists public.replies cascade;
drop table if exists public.posts cascade;
drop table if exists public.candles cascade;
drop function if exists public.give_hug(uuid);
drop function if exists public.report_item(text, uuid);
drop function if exists public.enforce_rate_limit() cascade;
