-- ============================================
--  THE YUSUF STORE - SUPABASE SCHEMA
--  Paste this whole file into the Supabase SQL Editor
--  (Dashboard -> SQL Editor -> New query -> Run)
-- ============================================

create extension if not exists "pgcrypto";

-- ---------- VISITS (page view tracking) ----------
create table if not exists public.visits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  session_id text not null default 'anon',
  page text,
  referrer text,
  device jsonb,
  ip text,
  ip_city text,
  ip_region text,
  ip_country text,
  ip_flag text,
  isp text,
  timezone text,
  is_proxy boolean default false,
  is_vpn boolean default false
);

create index if not exists idx_visits_created on public.visits (created_at desc);
create index if not exists idx_visits_session on public.visits (session_id);
create index if not exists idx_visits_page on public.visits (page);

-- ---------- ORDERS ----------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_id text unique,
  created_at timestamptz not null default now(),
  name text,
  email text,
  phone text,
  address text,
  items jsonb,
  total numeric,
  status text default 'confirmed',
  ip text,
  location jsonb,
  device jsonb,
  gps jsonb
);

create index if not exists idx_orders_created on public.orders (created_at desc);
create index if not exists idx_orders_status on public.orders (status);

-- ---------- PRODUCTS (inventory / product editor) ----------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  slug text unique,
  category text,
  price numeric,
  old_price numeric,
  stock integer default 0,
  active boolean default true,
  description text,
  image text,
  features jsonb
);

create index if not exists idx_products_category on public.products (category);
create index if not exists idx_products_active on public.products (active);

-- ---------- REVIEWS (visitor reviews on product pages) ----------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  slug text not null,
  product_name text,
  name text not null,
  rating integer not null default 5 check (rating >= 1 and rating <= 5),
  review text not null,
  photo text,
  approved boolean not null default true,
  ip text
);

create index if not exists idx_reviews_slug on public.reviews (slug, created_at desc);
create index if not exists idx_reviews_created on public.reviews (created_at desc);

-- Storage bucket "review-photos" (public) is created automatically by the
-- API on the first photo upload. No manual setup needed.

-- ---------- SECURITY ----------
-- Row Level Security ON. The server uses the service_role key,
-- which automatically bypasses RLS, so the anon key cannot read
-- this data directly from the browser.
alter table public.visits enable row level security;
alter table public.orders enable row level security;
alter table public.products enable row level security;
alter table public.reviews enable row level security;
