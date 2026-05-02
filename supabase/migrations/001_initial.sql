-- ============================================================
-- wearAI — schema inicial
-- Ejecutar en Supabase SQL Editor o con supabase db push
-- ============================================================

-- ── Profiles ────────────────────────────────────────────────
create table if not exists profiles (
  id              uuid references auth.users on delete cascade primary key,
  name            text,
  height          text,
  weight          text,
  body_type       text,
  fit_preference  text default 'regular',
  sizes           jsonb default '{}',
  style_notes     text,
  photo_front_path text,
  photo_side_path  text,
  photo_full_path  text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table profiles enable row level security;

create policy "Usuarios gestionan su propio perfil"
  on profiles for all
  using  (auth.uid() = id)
  with check (auth.uid() = id);

-- Crea perfil vacío automáticamente al registrarse
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();


-- ── Wardrobe items ──────────────────────────────────────────
create table if not exists wardrobe_items (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users on delete cascade not null,
  name        text not null,
  category    text not null,   -- 'top' | 'bottom' | 'outer' | 'shoes' | 'acc'
  color       text,
  season      text default 'todas',
  image_path  text,            -- path en Supabase Storage bucket 'wardrobe'
  added_at    timestamptz default now()
);

alter table wardrobe_items enable row level security;

create policy "Usuarios gestionan su propio armario"
  on wardrobe_items for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ── Outfits guardados ───────────────────────────────────────
create table if not exists outfits (
  id                  uuid default gen_random_uuid() primary key,
  user_id             uuid references auth.users on delete cascade not null,
  pieces_snapshot     jsonb not null,  -- [{id, name, cat, imageUrl}]
  analysis            jsonb,
  occasion            text,
  weather             text,
  generated_image_url text,
  saved_at            timestamptz default now()
);

alter table outfits enable row level security;

create policy "Usuarios gestionan sus outfits"
  on outfits for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);


-- ── Rate limiting de API ─────────────────────────────────────
create table if not exists api_usage (
  id       uuid default gen_random_uuid() primary key,
  user_id  uuid references auth.users on delete cascade not null,
  date     date not null default current_date,
  calls    integer default 0,
  unique   (user_id, date)
);

alter table api_usage enable row level security;

create policy "Usuarios leen su propio uso"
  on api_usage for select
  using (auth.uid() = user_id);

-- Solo el backend (service role) puede escribir api_usage
-- No create/update policy para anon/authenticated


-- ── Storage buckets ──────────────────────────────────────────
-- Ejecutar en Supabase Dashboard > Storage o con la CLI:
--
-- supabase storage create-bucket wardrobe --public
-- supabase storage create-bucket profiles
-- supabase storage create-bucket tryons
--
-- Policies de storage (Dashboard > Storage > Policies):
--
-- bucket: wardrobe (público)
--   SELECT: true
--   INSERT: auth.uid()::text = (storage.foldername(name))[1]
--   DELETE: auth.uid()::text = (storage.foldername(name))[1]
--
-- bucket: profiles (privado)
--   SELECT: auth.uid()::text = (storage.foldername(name))[1]
--   INSERT: auth.uid()::text = (storage.foldername(name))[1]
--   DELETE: auth.uid()::text = (storage.foldername(name))[1]
--
-- bucket: tryons (privado)
--   SELECT: auth.uid()::text = (storage.foldername(name))[1]
--   INSERT: auth.uid()::text = (storage.foldername(name))[1]
--   DELETE: auth.uid()::text = (storage.foldername(name))[1]
