-- Execute este arquivo no SQL Editor do seu projeto Supabase.
-- A autenticação é gerida por auth.users; não replique senhas nem crie tabelas
-- públicas de usuários. Toda tabela futura com dados do usuário deve usar RLS.

create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  updated_at timestamptz not null default now()
);

alter table public.user_settings enable row level security;

create policy "Usuários leem apenas suas configurações"
  on public.user_settings for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Usuários inserem apenas suas configurações"
  on public.user_settings for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Usuários atualizam apenas suas configurações"
  on public.user_settings for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Usuários removem apenas suas configurações"
  on public.user_settings for delete to authenticated
  using ((select auth.uid()) = user_id);
