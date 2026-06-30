-- AviaKassa — Supabase sxema (jsonb hujjat ombori)
-- Supabase dashboard -> SQL Editor -> New query -> shu kodni joylab "Run" bosing.

create table if not exists tickets       (id text primary key, doc jsonb not null, created_at timestamptz default now());
create table if not exists payments      (id text primary key, doc jsonb not null, created_at timestamptz default now());
create table if not exists inkassatsiya  (id text primary key, doc jsonb not null, created_at timestamptz default now());
create table if not exists rasxod        (id text primary key, doc jsonb not null, created_at timestamptz default now());
create table if not exists refund        (id text primary key, doc jsonb not null, created_at timestamptz default now());
create table if not exists settings      (id text primary key, doc jsonb not null);
create table if not exists otchot        (id text primary key, doc jsonb not null);

-- RLS: faqat server (service_role) kira oladi, public yo'q.
alter table tickets       enable row level security;
alter table payments      enable row level security;
alter table inkassatsiya  enable row level security;
alter table rasxod        enable row level security;
alter table refund        enable row level security;
alter table settings      enable row level security;
alter table otchot        enable row level security;
