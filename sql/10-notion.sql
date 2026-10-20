-- ============================================================
--  10 — Notion ligado ao site (20/10/2026)
--
--  A Edge Function `sincronizar-notion` lê a base pública "Central de
--  Artigos" e grava aqui. Este script prepara o banco para ela:
--    · cada estudo guarda de que página do Notion veio e quando ela foi
--      editada pela última vez (é assim que a função sabe o que mudou);
--    · o carimbo de data passa a valer só para mudança de TEXTO — marcar
--      Núcleo ou ocultar não é revisão do estudo;
--    · o que o autor vende (obra do Núcleo com o mesmo slug) fica premium;
--    · pg_cron chama a função a cada 30 minutos.
--
--  Depois deste, rodar `10-notion-vinculos.sql` (gerado pelo teste local),
--  que liga os 97 estudos semeados às páginas de origem.
--
--  Re-rodável.
-- ============================================================

alter table public.artigos add column if not exists notion_id          text unique;
alter table public.artigos add column if not exists notion_editado_em  timestamptz;
alter table public.artigos add column if not exists notion_removido_em timestamptz;

-- Carimbo só quando o texto muda. Antes, qualquer update sem data explícita
-- (marcar Núcleo, ocultar) virava "revisado agora" — e a sincronização ia
-- trocar a data de revisão do estudo só por bloqueá-lo.
create or replace function public.carimbar_atualizacao()
returns trigger language plpgsql as $$
begin
  if new.atualizado_em is not distinct from old.atualizado_em
     and (new.titulo is distinct from old.titulo
          or new.corpo  is distinct from old.corpo
          or new.resumo is distinct from old.resumo
          or new.eixos  is distinct from old.eixos
          or new.icone  is distinct from old.icone) then
    new.atualizado_em := now();
  end if;
  return new;
end;
$$;

-- Configuração da sincronização (nada disso sai para o site).
insert into public.config (chave, valor, publica) values
  ('notion_base', '3384e5cd-32c9-8099-ab85-de323f444ae4', false),
  ('notion_sync_em', '', false),
  ('notion_sync_relatorio', '', false)
on conflict (chave) do nothing;

-- O que ele vende não fica aberto: estudo com o mesmo slug de uma obra do Núcleo.
update public.artigos a
   set premium = true
 where not a.premium
   and exists (select 1 from public.obras o where o.slug = a.slug);

-- Agenda: a cada 30 minutos. A função tem trava de 1 minuto entre execuções
-- e não precisa de chave — ela só lê o Notion público e escreve com a própria
-- credencial de serviço, que nunca sai do Supabase.
create extension if not exists pg_net;

do $$
begin
  perform cron.unschedule('sincronizar-notion');
exception when others then null;
end $$;

select cron.schedule(
  'sincronizar-notion',
  '*/30 * * * *',
  $cron$
    select net.http_post(
      url := 'https://qcrdlmkguhxneagpcybb.supabase.co/functions/v1/sincronizar-notion',
      headers := '{"Content-Type": "application/json"}'::jsonb,
      body := '{"origem": "cron"}'::jsonb,
      timeout_milliseconds := 150000
    );
  $cron$
);

select
  (select count(*) from public.artigos where premium) as premium,
  (select string_agg(slug, ', ') from public.artigos where premium) as bloqueados,
  (select schedule from cron.job where jobname = 'sincronizar-notion') as agenda,
  (select count(*) from public.artigos where corpo like '%](/artigo/%') as com_link_do_painel;
