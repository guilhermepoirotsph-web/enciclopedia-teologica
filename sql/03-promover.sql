-- =====================================================================
--  Dar acesso de administrador ao Eleno (ou a qualquer outra pessoa)
--
--  ANTES de rodar: a pessoa precisa ter criado a conta no site, em /entrar,
--  com o e-mail abaixo, e confirmado o e-mail. É ela quem digita a própria
--  senha — a senha não passa por aqui, por WhatsApp nem por lugar nenhum.
--
--  Esta promoção é manual de propósito. Se ela coubesse a uma tela do painel,
--  qualquer conta criada no site poderia se promover sozinha a administrador.
-- =====================================================================

-- 1) Troque o e-mail abaixo pelo e-mail da conta que vai administrar o site.
--    Deixe as aspas.
do $$
declare
  alvo_email constant text := 'TROQUE-PELO-EMAIL@exemplo.com';
  alvo_id uuid;
begin
  select id into alvo_id from auth.users where lower(email) = lower(alvo_email);

  if alvo_id is null then
    raise exception 'Nao existe conta com o e-mail %. Crie a conta em /entrar primeiro e confirme o e-mail.', alvo_email;
  end if;

  insert into public.perfis (id, nome, email, papel, ativo)
  values (alvo_id, split_part(alvo_email, '@', 1), alvo_email, 'admin', true)
  on conflict (id) do update set papel = 'admin', ativo = true;

  raise notice 'Pronto: % agora e administrador.', alvo_email;
end$$;

-- 2) Confira. Tem que aparecer uma linha com papel = admin.
select p.email, p.papel, p.ativo
from public.perfis p
where p.papel in ('admin', 'editor')
order by p.criado_em;

-- =====================================================================
--  Outras operações do dia a dia
-- =====================================================================

-- Dar acesso ao Núcleo para um assinante por 12 meses:
--   update public.perfis
--      set papel = 'membro', membro_ate = now() + interval '12 months'
--    where lower(email) = lower('assinante@exemplo.com');

-- Tirar o acesso de alguém sem apagar a conta:
--   update public.perfis set ativo = false where lower(email) = lower('fulano@exemplo.com');

-- Ver quem tem assinatura vencendo nos próximos 30 dias:
--   select email, membro_ate from public.perfis
--    where papel = 'membro' and membro_ate between now() and now() + interval '30 days'
--    order by membro_ate;
