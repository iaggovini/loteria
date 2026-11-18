-- Execute este arquivo no SQL Editor do seu projeto Supabase.
-- A autenticação é gerida por auth.users; não replique senhas nem crie tabelas
-- públicas de usuários. Toda tabela futura com dados do usuário deve usar RLS.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

drop policy if exists "Usuários leem apenas suas configurações" on public.user_settings;
create policy "Usuários leem apenas suas configurações"
  on public.user_settings for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Usuários inserem apenas suas configurações" on public.user_settings;
create policy "Usuários inserem apenas suas configurações"
  on public.user_settings for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Usuários atualizam apenas suas configurações" on public.user_settings;
create policy "Usuários atualizam apenas suas configurações"
  on public.user_settings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Usuários removem apenas suas configurações" on public.user_settings;
create policy "Usuários removem apenas suas configurações"
  on public.user_settings for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Favoritos e bolão sincronizados com a conta (js/cloud.js).
-- Pode ser executado mais de uma vez com segurança.
-- ---------------------------------------------------------------------------

create table if not exists public.favorites (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  modality_id text not null check (modality_id ~ '^[a-z]{3,20}$'),
  modality_name text not null check (char_length(modality_name) <= 40),
  numbers smallint[] not null check (cardinality(numbers) between 1 and 50),
  saved_at timestamptz not null default now()
);

-- Trevos da +Milionária (adicionado depois; seguro em bancos já existentes).
alter table public.favorites add column if not exists extra smallint[]
  check (extra is null or cardinality(extra) between 1 and 6);

create index if not exists favorites_user_saved_idx
  on public.favorites (user_id, saved_at desc);

alter table public.favorites enable row level security;

drop policy if exists "Usuários leem apenas seus favoritos" on public.favorites;
create policy "Usuários leem apenas seus favoritos"
  on public.favorites for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Usuários inserem apenas seus favoritos" on public.favorites;
create policy "Usuários inserem apenas seus favoritos"
  on public.favorites for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Usuários atualizam apenas seus favoritos" on public.favorites;
create policy "Usuários atualizam apenas seus favoritos"
  on public.favorites for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Usuários removem apenas seus favoritos" on public.favorites;
create policy "Usuários removem apenas seus favoritos"
  on public.favorites for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Limite de segurança contra abuso (o site usa no máximo 20).
create or replace function public.limit_favorites()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.favorites where user_id = new.user_id) >= 50 then
    raise exception 'Limite de favoritos atingido';
  end if;
  return new;
end;
$$;

drop trigger if exists favorites_limit on public.favorites;
create trigger favorites_limit
  before insert on public.favorites
  for each row execute function public.limit_favorites();

create table if not exists public.pools (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data) = 'object' and pg_column_size(data) < 100000),
  updated_at timestamptz not null default now()
);

alter table public.pools enable row level security;

drop policy if exists "Usuários leem apenas seu bolão" on public.pools;
create policy "Usuários leem apenas seu bolão"
  on public.pools for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "Usuários inserem apenas seu bolão" on public.pools;
create policy "Usuários inserem apenas seu bolão"
  on public.pools for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "Usuários atualizam apenas seu bolão" on public.pools;
create policy "Usuários atualizam apenas seu bolão"
  on public.pools for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Usuários removem apenas seu bolão" on public.pools;
create policy "Usuários removem apenas seu bolão"
  on public.pools for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Somente usuários logados acessam estas tabelas pela API.
revoke all on public.favorites, public.pools from anon;
grant select, insert, update, delete on public.favorites, public.pools to authenticated;

-- ---------------------------------------------------------------------------
-- Exclusão da própria conta (LGPD). Apaga o usuário e, em cascata, favoritos,
-- bolão e configurações. Só age sobre a conta de quem está logado.
-- ---------------------------------------------------------------------------

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ---------------------------------------------------------------------------
-- Confere a senha atual antes de trocá-la. Só compara a senha da conta de
-- quem está logado; uma tentativa errada espera 1 segundo para dificultar
-- tentativas em sequência.
-- ---------------------------------------------------------------------------

create or replace function public.verify_my_password(current_password text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  ok boolean;
begin
  if auth.uid() is null then
    raise exception 'Não autenticado';
  end if;
  select coalesce(u.encrypted_password = extensions.crypt(current_password, u.encrypted_password), false)
    into ok
    from auth.users u
   where u.id = auth.uid();
  if not coalesce(ok, false) then
    perform pg_sleep(1);
  end if;
  return coalesce(ok, false);
end;
$$;

revoke all on function public.verify_my_password(text) from public, anon;
grant execute on function public.verify_my_password(text) to authenticated;
