-- Obras do autor à venda na Hotmart (páginas públicas conferidas em 14/10/2026).
-- Re-rodável: upsert pelo slug.
insert into public.obras (slug, titulo, subtitulo, descricao, capa, tipo, preco_centavos, link_externo, exemplo, ativo, ordem)
values
  ('na-terra-dos-viventes-kronos',
   'Na Terra dos Viventes — Kronos',
   '2º volume da série Na Terra dos Viventes · 1ª edição',
   'Uma visão cronológica da história da humanidade à luz das Escrituras: uma linha do tempo detalhada pelas épocas e períodos do plano divino, da criação ao último período probatório dos homens — e como cada era se encaixa no projeto de redenção e justiça de Deus. eBook com garantia de 7 dias pela Hotmart.',
   '/marca/capa-kronos.webp', 'livro', 1500,
   'https://hotmart.com/pt-br/marketplace/produtos/na-terra-dos-viventes-kronos/T103643057O',
   false, true, 1),
  ('epistola-as-denominacoes-evangelicas-do-brasil',
   'Epístola às Denominações Evangélicas do Brasil',
   'Manifesto à Igreja',
   'Uma exortação profunda e necessária que convoca a Igreja brasileira a retornar ao centro de sua fé: Jesus Cristo. Inspirada no rigor ético e na linguagem das epístolas do Novo Testamento, a carta aborda temas urgentes que têm desafiado a unidade do Corpo de Cristo. eBook com garantia de 7 dias pela Hotmart.',
   '/marca/capa-epistola.webp', 'livro', 500,
   'https://hotmart.com/pt-br/marketplace/produtos/epistola-as-denominacoes-evangelicas-do-brasil/K104385228G',
   false, true, 2)
on conflict (slug) do update set
  titulo = excluded.titulo, subtitulo = excluded.subtitulo, descricao = excluded.descricao,
  capa = excluded.capa, tipo = excluded.tipo, preco_centavos = excluded.preco_centavos,
  link_externo = excluded.link_externo, exemplo = excluded.exemplo, ativo = excluded.ativo,
  ordem = excluded.ordem;

update public.obras set ordem = 0 where slug = 'na-terra-dos-viventes';

select slug, preco_centavos, exemplo, ativo, ordem from public.obras order by ordem;
update public.obras set capa = '/marca/livro-capa-600.webp' where slug = 'na-terra-dos-viventes';
