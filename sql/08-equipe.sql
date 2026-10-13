-- ============================================================
--  08 — Equipe: o autor como admin + convite do Guilherme (13/10/2026)
--
--  Convite = e-mail pré-autorizado. Quando a conta com esse e-mail nasce
--  JÁ CONFIRMADA (Authentication → Add user → Auto Confirm User), o perfil
--  sai com o papel do convite em vez de 'leitor'. Cadastro público pelo
--  site nasce sem confirmação e continua 'leitor' — ninguém vira admin só
--  por digitar um e-mail que não é dele.
--
--  Senha: nunca passa por aqui. Quem cria a conta no painel do Supabase
--  é o Guilherme, e é ele quem digita a senha.
--
--  Re-rodável.
-- ============================================================

create table if not exists public.convites_equipe (
  email      text primary key,
  papel      text not null check (papel in ('editor', 'admin')),
  criado_em  timestamptz not null default now(),
  usado_em   timestamptz
);

alter table public.convites_equipe enable row level security;
revoke all on public.convites_equipe from anon, authenticated;

create or replace function public.ao_criar_usuario()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  convite text;
begin
  if new.email_confirmed_at is not null then
    select c.papel into convite
      from public.convites_equipe c
     where lower(c.email) = lower(new.email) and c.usado_em is null;
  end if;

  insert into public.perfis (id, nome, email, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.email, ''),
    coalesce(convite, 'leitor')::public.papel_usuario
  )
  on conflict (id) do nothing;

  if convite is not null then
    update public.convites_equipe set usado_em = now() where lower(email) = lower(new.email);
  end if;

  return new;
end;
$$;

-- O autor: conta já criada pelo Guilherme no Add user.
do $$
declare
  alvo_id uuid;
begin
  select id into alvo_id from auth.users where lower(email) = 'mkpgutemberg@gmail.com';
  if alvo_id is null then
    raise exception 'Conta mkpgutemberg@gmail.com ainda nao existe em Authentication > Users.';
  end if;
  insert into public.perfis (id, nome, email, papel, ativo)
  values (alvo_id, 'Eleno Gutemberg Silva', 'mkpgutemberg@gmail.com', 'admin', true)
  on conflict (id) do update set papel = 'admin', ativo = true, nome = 'Eleno Gutemberg Silva';
end$$;

-- O Guilherme: convite de admin, usado quando ele criar a conta no Add user.
insert into public.convites_equipe (email, papel)
values ('guilhermepoirotsph@gmail.com', 'admin')
on conflict (email) do update set papel = 'admin', usado_em = null;

-- Se a conta dele já existe (criada antes deste script), promove direto.
update public.perfis set papel = 'admin', ativo = true
 where lower(email) = 'guilhermepoirotsph@gmail.com';
update public.convites_equipe set usado_em = now()
 where email = 'guilhermepoirotsph@gmail.com'
   and exists (select 1 from public.perfis where lower(email) = 'guilhermepoirotsph@gmail.com');

-- WhatsApp do autor.
update public.config set valor = '5512981408270' where chave = 'whatsapp';

select p.email, p.papel::text, p.ativo from public.perfis p where p.papel in ('admin','editor')
union all
select c.email || ' (convite)', c.papel, c.usado_em is null from public.convites_equipe c;
