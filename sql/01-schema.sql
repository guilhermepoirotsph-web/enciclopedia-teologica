-- =====================================================================
--  Enciclopédia Teológica e Antropológica — esquema do banco (Supabase)
--
--  Ordem de execução:
--    1. 01-schema.sql   (este arquivo)
--    2. 02-seed.sql     (os 97 estudos, gerado por scripts/gerar-conteudo.mjs)
--    3. 03-promover.sql (transforma a conta do Eleno em admin)
--
--  Cole INTEIRO no SQL Editor do Supabase e rode de uma vez. É reexecutável.
--
--  Princípios que este arquivo segue, e por quê:
--   · Leitura pública passa por VIEW com colunas explícitas — nunca por policy
--     permissiva na tabela. Uma tabela com coluna secreta (o corpo pago) não
--     pode ter SELECT liberado para anon.
--   · O corpo de artigo pago só sai pela função `ler_artigo`, que confere a
--     assinatura NO SERVIDOR. O navegador nunca decide o que pode ler.
--   · Papel de usuário não é editável pelo próprio usuário. RLS escolhe QUAIS
--     LINHAS, não QUAIS COLUNAS — a trava do papel é gatilho, não policy.
--   · Perfil nasce inerte: sem papel de poder e sem acesso pago. Promoção é
--     manual, por SQL. Senão qualquer conta criada no site vira administrador.
-- =====================================================================

begin;

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- papéis

do $$
begin
  if not exists (select 1 from pg_type where typname = 'papel_usuario') then
    create type public.papel_usuario as enum ('leitor', 'membro', 'editor', 'admin');
  end if;
end$$;

-- ---------------------------------------------------------------- tabelas

create table if not exists public.perfis (
  id          uuid primary key references auth.users(id) on delete cascade,
  nome        text        not null default '',
  email       text        not null default '',
  papel       public.papel_usuario not null default 'leitor',
  ativo       boolean     not null default true,
  membro_ate  timestamptz,
  criado_em   timestamptz not null default now()
);

create table if not exists public.eixos (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  nome       text not null,
  descricao  text not null default '',
  ordem      int  not null default 0
);

create table if not exists public.artigos (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  titulo        text not null,
  icone         text not null default '',
  eixos         text[] not null default '{}',
  resumo        text not null default '',
  corpo         text not null default '',
  referencias   text[] not null default '{}',
  capa          text,
  palavras      int  not null default 0,
  minutos       int  not null default 3,
  premium       boolean not null default false,
  publicado     boolean not null default false,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists artigos_publicado_idx on public.artigos (publicado, atualizado_em desc);
create index if not exists artigos_eixos_idx     on public.artigos using gin (eixos);

create table if not exists public.obras (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  titulo         text not null,
  subtitulo      text not null default '',
  descricao      text not null default '',
  capa           text,
  tipo           text not null default 'serie',
  preco_centavos int,
  link_externo   text,
  -- `exemplo` = ainda não existe de verdade. O site mostra a tarja "em
  -- preparação" e esconde o botão de compra. É o que impede o portal de
  -- anunciar produto inexistente.
  exemplo        boolean not null default true,
  ativo          boolean not null default true,
  ordem          int not null default 0
);

create table if not exists public.mensagens (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null,
  email     text not null,
  assunto   text not null default '',
  corpo     text not null,
  lido      boolean not null default false,
  criado_em timestamptz not null default now()
);

create table if not exists public.inscritos (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null default '',
  email     text unique not null,
  ativo     boolean not null default true,
  criado_em timestamptz not null default now()
);

create table if not exists public.config (
  chave text primary key,
  valor text not null default '',
  -- só o que estiver marcado como público sai para o site
  publica boolean not null default true
);

-- ------------------------------------------------------------- funções

-- Quem é editor ou admin. SECURITY DEFINER para não depender de o chamador
-- poder ler a tabela `perfis` — senão a policy que usa esta função entra em
-- recursão consigo mesma.
create or replace function public.eh_editor()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = auth.uid() and p.ativo and p.papel in ('editor', 'admin')
  );
$$;

-- Quem tem acesso ao conteúdo pago: membro com assinatura na validade, ou a
-- própria equipe.
create or replace function public.eh_membro()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.perfis p
    where p.id = auth.uid()
      and p.ativo
      and (
        p.papel in ('editor', 'admin')
        or (p.papel = 'membro' and (p.membro_ate is null or p.membro_ate > now()))
      )
  );
$$;

-- ------------------------------------------------------------- gatilhos

-- Perfil nasce junto com o usuário, INERTE: papel 'leitor', sem acesso pago.
create or replace function public.ao_criar_usuario()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.perfis (id, nome, email, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', ''),
    coalesce(new.email, ''),
    'leitor'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- O SQL Editor roda como `postgres`, que não é dono de auth.users: um
-- `drop trigger if exists` passa na primeira colagem e estoura na segunda.
-- Por isso a criação vai dentro de um bloco que engole a falta de permissão.
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'ao_criar_usuario_trg'
  ) then
    create trigger ao_criar_usuario_trg
      after insert on auth.users
      for each row execute function public.ao_criar_usuario();
  end if;
exception
  when insufficient_privilege then
    raise notice 'Sem permissao para criar o gatilho em auth.users. Crie-o pelo painel (Database > Triggers) ou peca ao suporte.';
end$$;

-- Ninguém se promove. O usuário pode corrigir o próprio nome; papel, validade
-- da assinatura e o "ativo" só mudam por quem já é editor/admin.
-- (RLS decide QUAIS LINHAS o usuário alcança; QUAIS COLUNAS ele pode mexer é
--  problema de gatilho — foi exatamente assim que uma policy de "cada um edita
--  a própria linha" já deixou qualquer conta virar administradora.)
create or replace function public.trava_promocao()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- Saída para operação de servidor: SQL Editor e service_role rodam sem
  -- usuário logado, então auth.uid() é nulo. É por aqui que o PRIMEIRO admin
  -- nasce (03-promover.sql). Sem esta linha ninguém nunca seria promovido —
  -- e o pior: o UPDATE responderia "deu certo" sem ter mudado nada.
  -- O papel `anon` não alcança este gatilho: ele não tem policy de UPDATE.
  if auth.uid() is null or public.eh_editor() then
    return new;
  end if;

  -- Recusa ALTO. Reverter em silêncio faria a tela dizer "salvo" enquanto o
  -- banco ignorava a alteração, que é o pior defeito possível.
  if new.papel      is distinct from old.papel
  or new.membro_ate is distinct from old.membro_ate
  or new.ativo      is distinct from old.ativo then
    raise exception 'Somente a equipe pode alterar papel, validade de assinatura ou situacao do perfil.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists trava_promocao_trg on public.perfis;
create trigger trava_promocao_trg
  before update on public.perfis
  for each row execute function public.trava_promocao();

create or replace function public.carimbar_atualizacao()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

drop trigger if exists artigos_carimbo_trg on public.artigos;
create trigger artigos_carimbo_trg
  before update on public.artigos
  for each row execute function public.carimbar_atualizacao();

-- ------------------------------------------------------------------ RLS

alter table public.perfis    enable row level security;
alter table public.eixos     enable row level security;
alter table public.artigos   enable row level security;
alter table public.obras     enable row level security;
alter table public.mensagens enable row level security;
alter table public.inscritos enable row level security;
alter table public.config    enable row level security;

-- perfis: cada um vê e edita a própria linha; a equipe vê e edita todas.
drop policy if exists perfis_ler_proprio    on public.perfis;
drop policy if exists perfis_editar_proprio on public.perfis;
drop policy if exists perfis_equipe         on public.perfis;

create policy perfis_ler_proprio on public.perfis
  for select to authenticated using (id = auth.uid() or public.eh_editor());
create policy perfis_editar_proprio on public.perfis
  for update to authenticated using (id = auth.uid() or public.eh_editor())
  with check (id = auth.uid() or public.eh_editor());
create policy perfis_equipe on public.perfis
  for delete to authenticated using (public.eh_editor());

-- artigos, eixos, obras: escrita só da equipe. Leitura NÃO tem policy para
-- anon de propósito — o público entra pelas views abaixo. `artigos` guarda o
-- corpo pago, então liberar SELECT aqui entregaria o conteúdo do Núcleo.
drop policy if exists artigos_equipe on public.artigos;
drop policy if exists eixos_equipe   on public.eixos;
drop policy if exists obras_equipe   on public.obras;

create policy artigos_equipe on public.artigos
  for all to authenticated using (public.eh_editor()) with check (public.eh_editor());
create policy eixos_equipe on public.eixos
  for all to authenticated using (public.eh_editor()) with check (public.eh_editor());
create policy obras_equipe on public.obras
  for all to authenticated using (public.eh_editor()) with check (public.eh_editor());

-- mensagens e inscritos: qualquer visitante ESCREVE (é o formulário), só a
-- equipe LÊ. Sem isso, a caixa de entrada do autor viraria lista pública.
drop policy if exists mensagens_enviar on public.mensagens;
drop policy if exists mensagens_ler    on public.mensagens;
drop policy if exists inscritos_entrar on public.inscritos;
drop policy if exists inscritos_ler    on public.inscritos;

create policy mensagens_enviar on public.mensagens
  for insert to anon, authenticated with check (
    length(nome) between 1 and 90
    and length(email) between 5 and 140
    and email like '%@%'
    and length(corpo) between 5 and 4000
  );
create policy mensagens_ler on public.mensagens
  for select to authenticated using (public.eh_editor());

create policy inscritos_entrar on public.inscritos
  for insert to anon, authenticated with check (
    length(email) between 5 and 140 and email like '%@%'
  );
create policy inscritos_ler on public.inscritos
  for select to authenticated using (public.eh_editor());

drop policy if exists config_equipe on public.config;
create policy config_equipe on public.config
  for all to authenticated using (public.eh_editor()) with check (public.eh_editor());

-- ----------------------------------------------------------------- views

-- Leitura pública com COLUNAS EXPLÍCITAS. Nada de select *: no dia em que uma
-- coluna secreta for adicionada à tabela, ela não vaza sozinha pela view.
-- Estas views NÃO levam security_invoker: elas furam a RLS de propósito, que é
-- exatamente o papel delas.
create or replace view public.artigos_publicos as
  select
    a.slug, a.titulo, a.icone, a.eixos, a.resumo, a.capa,
    a.palavras, a.minutos, a.premium, a.criado_em, a.atualizado_em,
    -- o corpo do artigo pago NÃO sai por aqui, nem cortado
    case when a.premium then null else a.corpo end as corpo
  from public.artigos a
  where a.publicado;

create or replace view public.eixos_publicos as
  select e.slug, e.nome, e.descricao, e.ordem,
         (select count(*) from public.artigos a
           where a.publicado and e.nome = any (a.eixos)) as total
  from public.eixos e;

create or replace view public.obras_publicas as
  select o.slug, o.titulo, o.subtitulo, o.descricao, o.capa, o.tipo,
         o.preco_centavos, o.link_externo, o.exemplo, o.ativo, o.ordem
  from public.obras o
  where o.ativo;

create or replace view public.config_publica as
  select c.chave, c.valor from public.config c where c.publica;

grant select on public.artigos_publicos, public.eixos_publicos,
                public.obras_publicas, public.config_publica
  to anon, authenticated;

-- ------------------------------------------------- leitura de um artigo

-- Corta o texto no fim do primeiro parágrafo depois do mínimo. Separada para
-- poder ser testada sozinha, em vez de ficar escondida dentro de um CASE.
create or replace function public.previa_texto(txt text, minimo int default 900)
returns text
language sql immutable
as $$
  select case
    when length(txt) <= minimo then txt
    when position(E'\n\n' in substr(txt, minimo)) = 0 then left(txt, minimo)
    else left(txt, minimo + position(E'\n\n' in substr(txt, minimo)) - 2)
  end;
$$;

-- O ÚNICO caminho para o corpo de um artigo do Núcleo.
-- A decisão de cortar acontece aqui, no servidor. Se o leitor não é membro, o
-- texto completo nem chega a sair do banco — não existe "o front corta depois".
create or replace function public.ler_artigo(p_slug text)
returns table (
  slug text, titulo text, icone text, eixos text[], resumo text, capa text,
  referencias text[], palavras int, minutos int, premium boolean,
  criado_em timestamptz, atualizado_em timestamptz, corpo text, cortado boolean
)
language plpgsql stable security definer set search_path = public
as $$
declare
  liberado boolean;
begin
  select public.eh_membro() into liberado;

  return query
    select
      a.slug, a.titulo, a.icone, a.eixos, a.resumo, a.capa,
      a.referencias, a.palavras, a.minutos, a.premium,
      a.criado_em, a.atualizado_em,
      case
        when not a.premium or liberado then a.corpo
        else public.previa_texto(a.corpo, 900)
      end as corpo,
      (a.premium and not liberado) as cortado
    from public.artigos a
    where a.slug = p_slug and a.publicado;
end;
$$;

-- Toda função nasce com EXECUTE para PUBLIC, e anon é membro de PUBLIC:
-- revogar de anon sozinho não desfaz nada. Revoga-se de PUBLIC e concede-se de
-- volta só a quem deve.
revoke all on function public.ler_artigo(text) from public;
revoke all on function public.eh_editor() from public;
revoke all on function public.eh_membro() from public;
grant execute on function public.ler_artigo(text) to anon, authenticated;
grant execute on function public.eh_editor()  to authenticated;
grant execute on function public.eh_membro()  to authenticated;

-- --------------------------------------------------------- configuração

insert into public.config (chave, valor, publica) values
  ('whatsapp', '', true),
  ('email', '', true),
  ('instagram', '', true),
  ('youtube', '', true),
  ('hotmart', 'https://go.hotmart.com/I103629686U', true),
  ('pix_chave', '', true),
  ('pix_nome', '', true),
  ('pix_cidade', '', true),
  ('infinitepay', '', true)
on conflict (chave) do nothing;

-- -------------------------------------------------------- obras iniciais

insert into public.obras (slug, titulo, subtitulo, descricao, tipo, link_externo, exemplo, ordem) values
  ('na-terra-dos-viventes', 'Na Terra dos Viventes', 'Espírito, Alma e Corpo',
   'O livro em que Eleno Gutemberg destrincha a constituição tripartida do ser humano — o que é espírito, o que é alma, o que morre, o que permanece.',
   'livro', 'https://go.hotmart.com/I103629686U', false, 0)
on conflict (slug) do nothing;

commit;

-- =====================================================================
--  Conferência rápida depois de rodar (esperado entre parênteses):
--
--    select count(*) from public.artigos;                  -- (0 antes do seed)
--    select * from public.artigos_publicos limit 1;        -- (vazio antes do seed)
--    select public.eh_editor();                            -- (false: ninguém é admin ainda)
--
--  Só depois de 03-promover.sql a conta do Eleno entra no painel.
-- =====================================================================
