-- ============================================================
--  05 — Cofre de backups, dentro do próprio banco
--
--  Padrão da casa (Cláudia Móveis, Emy Art, Líder Imóveis):
--    · a lista de tabelas NUNCA é escrita à mão: varre pg_class.
--      No Emy Art a lista à mão deixou tabelas novas fora e o backup
--      rodou "com sucesso" por dias salvando nulo.
--    · a tabela `backups` é EXCLUÍDA de si mesma; sem isso cada backup
--      guarda os anteriores e dobra de tamanho por dia.
--    · agenda com pg_cron, dentro do Postgres: sem VPS, sem n8n, sem
--      credencial — se o banco está de pé, o backup rodou.
--
--  Aqui o backup leva o acervo inteiro (~700 KB) e TAMBÉM e-mails de
--  leitores (perfis, inscritos) e a caixa de mensagens. Por isso só o
--  ADMIN lê a tabela, e as funções só rodam como dono (pg_cron) ou
--  service_role — nem anon nem leitor logado conseguem chamar.
--
--  Cobre o que acontece de fato: estudo apagado sem querer, edição
--  que estragou texto, configuração zerada. Não cobre o projeto do
--  Supabase sumir — para isso, exportar um JSON para fora de vez em
--  quando (Table Editor → backups → baixar `conteudo`).
--
--  Re-rodável.
-- ============================================================

create extension if not exists pg_cron;

create table if not exists public.backups (
  id         uuid primary key default gen_random_uuid(),
  arquivo    text not null,
  tamanho_kb int  not null default 0,
  conteudo   jsonb not null,
  criado_em  timestamptz not null default now()
);

alter table public.backups enable row level security;

-- Só leitura, só admin. Ninguém grava pela API: quem grava é a função.
revoke all on public.backups from anon, authenticated;
grant select on public.backups to authenticated;

drop policy if exists backups_admin_le on public.backups;
create policy backups_admin_le on public.backups for select
  to authenticated
  using (exists (
    select 1 from public.perfis p
     where p.id = auth.uid() and p.ativo and p.papel = 'admin'
  ));

-- Guarda os 30 mais novos.
create or replace function public.limpar_backups_antigos()
returns trigger language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.backups
   where id in (select id from public.backups order by criado_em desc offset 30);
  return null;
end $$;

drop trigger if exists tg_backups_faxina on public.backups;
create trigger tg_backups_faxina
  after insert on public.backups
  for each statement execute function public.limpar_backups_antigos();

-- ------------------------------------------------------------
--  Retrato de TODAS as tabelas base de public, menos `backups`.
--  security definer: enxerga o que a RLS fecha — backup que só vê o
--  público não é backup.
-- ------------------------------------------------------------
create or replace function public.fn_gerar_backup()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  t       record;
  linhas  jsonb;
  saida   jsonb := '{}'::jsonb;
begin
  for t in
    select c.relname as tabela
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind = 'r'
       and c.relname <> 'backups'
     order by c.relname
  loop
    execute format(
      'select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from public.%I x',
      t.tabela
    ) into linhas;
    saida := saida || jsonb_build_object(t.tabela, linhas);
  end loop;

  return saida;
end $$;

create or replace function public.fn_salvar_backup()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  conteudo jsonb;
  tam      int;
  nome     text;
  tabelas  int;
  estudos  int;
begin
  conteudo := public.fn_gerar_backup();
  tabelas  := (select count(*) from jsonb_object_keys(conteudo));
  estudos  := coalesce(jsonb_array_length(conteudo -> 'artigos'), 0);

  -- Backup sem tabela, ou sem um estudo sequer, é falha — não "banco vazio".
  if tabelas = 0 then
    raise exception 'backup vazio: nenhuma tabela encontrada em public';
  end if;
  if estudos = 0 then
    raise exception 'backup suspeito: a tabela artigos veio vazia';
  end if;

  tam  := (pg_column_size(conteudo) / 1024)::int;
  nome := 'enciclopedia-'
       || to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM-DD-HH24MI')
       || '.json';

  insert into public.backups (arquivo, tamanho_kb, conteudo)
  values (nome, tam, conteudo);

  return nome || ' (' || tabelas || ' tabelas, ' || estudos || ' estudos, ' || tam || ' KB)';
end $$;

-- REVOKE de PUBLIC também: tirar só de anon não tira o que veio de PUBLIC.
revoke all on function public.fn_gerar_backup()       from public, anon, authenticated;
revoke all on function public.fn_salvar_backup()      from public, anon, authenticated;
revoke all on function public.limpar_backups_antigos() from public, anon, authenticated;

-- ------------------------------------------------------------
--  Agenda: 07:00 UTC = 04h de Brasília.
-- ------------------------------------------------------------
do $$
begin
  perform cron.unschedule('backup-enciclopedia-diario');
exception when others then
  null;
end $$;

select cron.schedule(
  'backup-enciclopedia-diario',
  '0 7 * * *',
  $cron$ select public.fn_salvar_backup() $cron$
);

-- Primeiro backup agora, para provar que funciona — e conferência.
select public.fn_salvar_backup() as primeiro_backup,
       (select schedule || case when active then ' ativo' else ' INATIVO' end
          from cron.job where jobname = 'backup-enciclopedia-diario') as agenda;
