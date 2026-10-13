-- ============================================================
--  06 — Porta do backup redundante (n8n), sem segredo nenhum
--
--  O backup principal é o pg_cron das 04h (05-backup.sql). O n8n do VPS
--  chama esta função às 04h10 como segunda garantia: se o pg_cron não
--  rodou, ela roda o backup; se rodou, só confirma.
--
--  Por que uma função própria em vez de dar ao n8n a chave secreta ou a
--  senha do Postgres: assim o fluxo usa só a chave PUBLICÁVEL (a mesma que
--  já está no site) e não existe credencial para vazar. A trava é a regra
--  de 20 horas — no máximo UM backup por dia, por mais que alguém chame.
--  Ela devolve só nome e tamanho, nunca o conteúdo.
--
--  De quebra, a chamada diária mantém o projeto acordado (plano grátis
--  pausa com 7 dias sem atividade).
--
--  Re-rodável.
-- ============================================================

create or replace function public.fn_backup_redundante()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  ultimo record;
  feito  text;
begin
  select arquivo, tamanho_kb, criado_em
    into ultimo
    from public.backups
   order by criado_em desc
   limit 1;

  if ultimo.criado_em is not null and ultimo.criado_em > now() - interval '20 hours' then
    return jsonb_build_object(
      'ok', true,
      'acao', 'ja_existia',
      'arquivo', ultimo.arquivo,
      'tamanho_kb', ultimo.tamanho_kb,
      'idade_horas', round(extract(epoch from now() - ultimo.criado_em) / 3600, 1)
    );
  end if;

  feito := public.fn_salvar_backup();
  return jsonb_build_object('ok', true, 'acao', 'gerado_agora', 'resultado', feito);
end $$;

revoke all on function public.fn_backup_redundante() from public;
grant execute on function public.fn_backup_redundante() to anon, authenticated;

select public.fn_backup_redundante() as teste;
