-- ============================================================
-- MIGRATION v11 — Tokens de push (APNs) para o app mobile iOS
-- ============================================================
-- Guarda o device token APNs de cada dispositivo para que a Edge
-- Function `send-push` saiba para onde direcionar as notificações.
-- O app (src/mobile/ui/push.js) faz upsert do token ao registrar.
-- ============================================================

create table if not exists public.push_tokens (
  token        text primary key,
  platform     text not null default 'ios',     -- ios | android | web
  user_id      text,                             -- opcional (app sem auth real)
  role         text,                             -- opcional: direcionar por papel
  obra_id      text,                             -- opcional: direcionar por obra
  device_info  text,                             -- modelo/SO (debug)
  enabled      boolean not null default true,    -- false = opt-out / token inválido
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_push_tokens_role on public.push_tokens (role) where enabled;
create index if not exists idx_push_tokens_obra on public.push_tokens (obra_id) where enabled;

-- updated_at automático
create or replace function public.touch_push_tokens()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_touch_push_tokens on public.push_tokens;
create trigger trg_touch_push_tokens
  before update on public.push_tokens
  for each row execute function public.touch_push_tokens();

-- RLS: o app (anon) pode registrar/atualizar o próprio token; leitura/envio
-- fica restrito ao service_role (usado pela Edge Function send-push).
alter table public.push_tokens enable row level security;

drop policy if exists push_tokens_anon_upsert on public.push_tokens;
create policy push_tokens_anon_upsert on public.push_tokens
  for insert to anon, authenticated
  with check (true);

drop policy if exists push_tokens_anon_update on public.push_tokens;
create policy push_tokens_anon_update on public.push_tokens
  for update to anon, authenticated
  using (true) with check (true);

-- (sem policy de SELECT para anon → só service_role lê os tokens)
