/**
 * Refaz a cópia de reserva do site (public/conteudo + sitemap) a partir do
 * BANCO, que desde 20/10/2026 é alimentado pelo Notion.
 *
 *   node scripts/acervo-do-banco.mjs
 *
 * Roda sozinho no começo do `subir.mjs`. Antes, a reserva vinha do
 * _acervo/acervo.json da migração de setembro — e ficou para trás: 97 estudos
 * em vez de 103, 5 textos cortados pela metade (o conversor antigo parava em
 * 400 blocos) e um estudo que hoje está à venda servido inteiro num JSON público.
 *
 * Lê só as views PÚBLICAS, com a chave publicável — então o corpo de estudo do
 * Núcleo nunca chega aqui (a view devolve null) e nunca vai para /public.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const fonte = readFileSync(join(RAIZ, 'src', 'dados', 'supabase.ts'), 'utf8');
const base = fonte.match(/SUPABASE_URL = [^;]*'(https:[^']*)'/)?.[1];
const chave = fonte.match(/SUPABASE_CHAVE_PUBLICAVEL = [^;]*'(sb_publishable_[^']*)'/)?.[1];
if (!base || !chave) {
  console.error('Sem URL/chave do Supabase em src/dados/supabase.ts.');
  process.exit(1);
}

const ler = async (caminho) => {
  const r = await fetch(`${base}/rest/v1/${caminho}`, { headers: { apikey: chave, Authorization: `Bearer ${chave}` } });
  if (!r.ok) throw new Error(`${caminho.split('?')[0]} respondeu HTTP ${r.status}`);
  return r.json();
};

let artigos, eixos;
try {
  artigos = await ler('artigos_publicos?select=*&order=atualizado_em.desc&limit=2000');
  eixos = await ler('eixos_publicos?select=*&order=ordem');
} catch (e) {
  console.error(`Banco fora do ar (${e.message}) — a reserva antiga fica como está.`);
  process.exit(0);
}

// Trava: resposta parcial não pode encolher a reserva.
if (artigos.length < 90) {
  console.error(`O banco devolveu só ${artigos.length} estudos — a reserva antiga fica como está.`);
  process.exit(0);
}

const indice = artigos.map((a) => ({
  slug: a.slug,
  titulo: a.titulo,
  icone: a.icone ?? '',
  eixos: a.eixos ?? [],
  resumo: a.resumo ?? '',
  criado: a.criado_em,
  atualizado: a.atualizado_em,
  palavras: a.palavras ?? 0,
  minutos: a.minutos ?? 3,
  referencias: a.referencias ?? [],
  premium: Boolean(a.premium),
  publicado: true,
  capa: a.capa ?? null,
}));

const listaEixos = eixos
  .filter((e) => Number(e.total) > 0)
  .map((e) => ({ nome: e.nome, slug: e.slug, descricao: e.descricao ?? '', total: Number(e.total) }))
  .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));

const dirArtigos = join(RAIZ, 'public', 'conteudo', 'artigos');
rmSync(dirArtigos, { recursive: true, force: true });
mkdirSync(dirArtigos, { recursive: true });
writeFileSync(join(RAIZ, 'public', 'conteudo', 'indice.json'), JSON.stringify(indice), 'utf8');
writeFileSync(join(RAIZ, 'public', 'conteudo', 'eixos.json'), JSON.stringify(listaEixos), 'utf8');

// REGRA DE SEGURANÇA: estudo do Núcleo não ganha arquivo de corpo em /public.
let retidos = 0;
for (const a of artigos) {
  if (a.premium || !a.corpo) {
    retidos++;
    continue;
  }
  const item = indice.find((i) => i.slug === a.slug);
  writeFileSync(join(dirArtigos, a.slug + '.json'), JSON.stringify({ ...item, md: a.corpo }), 'utf8');
}

// Sitemap (o publicar.mjs troca o domínio no dia em que ele existir).
const DOMINIO = 'https://' + (process.env.DOMINIO || 'enciclopediateologica.com.br').replace(/^https?:\/\//, '');
const url = (caminho, data, prio) =>
  `  <url><loc>${DOMINIO}${caminho}</loc>${data ? `<lastmod>${String(data).slice(0, 10)}</lastmod>` : ''}<priority>${prio}</priority></url>`;
writeFileSync(
  join(RAIZ, 'public', 'sitemap.xml'),
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    url('/', indice[0]?.atualizado, '1.0'),
    url('/biblioteca', indice[0]?.atualizado, '0.9'),
    url('/eixos', null, '0.7'),
    url('/nucleo', null, '0.7'),
    url('/livro', null, '0.7'),
    url('/autor', null, '0.6'),
    url('/apoie', null, '0.5'),
    url('/contato', null, '0.5'),
    ...listaEixos.map((e) => url('/eixo/' + e.slug, null, '0.6')),
    // Estudo do Núcleo não entra: o buscador acharia só a prévia.
    ...indice.filter((a) => !a.premium).map((a) => url('/artigo/' + a.slug, a.atualizado, '0.8')),
    '</urlset>',
  ].join('\n'),
  'utf8'
);

console.log(`reserva refeita a partir do banco: ${indice.length} estudos, ${listaEixos.length} eixos, ${retidos} sem corpo público (Núcleo)`);
