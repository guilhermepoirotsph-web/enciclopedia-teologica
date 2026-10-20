/**
 * Teste da sincronização com o Notion, SEM tocar no banco.
 *
 *   node scripts/testar-notion.mjs
 *
 * 1. Lê a base pública do Notion (mesmo código da Edge Function).
 * 2. Regressão: converte, no modo "texto puro", os estudos que NÃO mudaram desde
 *    a migração e compara com _acervo/acervo.json — tem que dar idêntico, senão
 *    a sincronização reescreveria texto que ninguém editou.
 * 3. Mostra como sairiam os estudos novos e os editados, já no modo formatado.
 * 4. Gera sql/10-notion-vinculos.sql: o notion_id + data de edição de cada um dos
 *    97 estudos já no banco, para a primeira sincronização não reimportar tudo.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  listarBase, carregarPagina, renderizar, montar, comTracos, slugificar, limparTitulo,
} from '../supabase/functions/sincronizar-notion/index.ts';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const acervo = JSON.parse(readFileSync(join(RAIZ, '_acervo', 'acervo.json'), 'utf8'));
const datas = new Map(
  readFileSync(join(RAIZ, '_acervo', 'datas.txt'), 'utf8').trim().split(/[;\n]/).filter(Boolean)
    .map((l) => { const [id, c, e] = l.trim().split(','); return [id, { criado: +c * 1000, editado: +e * 1000 }]; })
);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

// Slug de cada estudo do acervo, na MESMA ordem e com a mesma regra de colisão
// do gerar-conteudo.mjs — é assim que o banco foi semeado.
const usados = new Set();
const slugDoAcervo = new Map();
for (const a of acervo) {
  let slug = slugificar(limparTitulo(a.titulo).titulo);
  while (usados.has(slug)) slug += '-2';
  usados.add(slug);
  slugDoAcervo.set(comTracos(a.id), slug);
}

const linhas = await listarBase();
console.log(`Notion: ${linhas.length} estudos na base pública`);

const doAcervo = new Map(acervo.map((a) => [comTracos(a.id), a]));
const paginas = new Map(linhas.map((l) => [l.id, { slug: slugDoAcervo.get(l.id) || slugificar(limparTitulo(l.titulo).titulo), titulo: limparTitulo(l.titulo).titulo }]));

const intocados = [], editados = [], novos = [];
for (const l of linhas) {
  const a = doAcervo.get(l.id);
  if (!a) novos.push(l);
  else if (l.editado - (datas.get(a.id.slice(-10))?.editado ?? 0) > 60_000) editados.push(l);
  else intocados.push(l);
}
const sumiram = acervo.filter((a) => !linhas.some((l) => l.id === comTracos(a.id)));
console.log(`intocados ${intocados.length} · editados ${editados.length} · novos ${novos.length} · sumiram do Notion ${sumiram.length}`);

let iguais = 0;
const diferentes = [];
for (const l of intocados) {
  const blocos = await carregarPagina(l.id);
  const md = renderizar(blocos, l.id, { formatar: false, paginas });
  if (md === doAcervo.get(l.id).md) iguais++;
  else {
    const A = doAcervo.get(l.id).md.split('\n'), B = md.split('\n');
    let i = 0; while (i < A.length && A[i] === B[i]) i++;
    diferentes.push({ titulo: l.titulo, notion: md.length, acervo: doAcervo.get(l.id).md.length, linha: i, totalAcervo: A.length, a: A[i], b: B[i] });
  }
  await espera(400);
}
console.log(`\nREGRESSÃO texto puro: ${iguais}/${intocados.length} idênticos à migração`);
for (const d of diferentes.slice(0, 12)) {
  console.log(`  ≠ ${d.titulo} (notion ${d.notion} × acervo ${d.acervo} caracteres; 1ª diferença na linha ${d.linha} de ${d.totalAcervo})`);
  console.log(`      acervo: ${JSON.stringify(d.a ?? '<fim>').slice(0, 140)}`);
  console.log(`      notion: ${JSON.stringify(d.b ?? '<fim>').slice(0, 140)}`);
}

console.log('\nCOMO SAIRIAM (modo formatado):');
for (const l of [...novos, ...editados]) {
  const blocos = await carregarPagina(l.id);
  const md = renderizar(blocos, l.id, { formatar: true, paginas });
  const c = montar(l, md);
  const links = (c.corpo.match(/\]\(\/artigo\/[^)]+\)/g) || []).length;
  console.log(`  ${novos.includes(l) ? 'NOVO  ' : 'EDITADO'} ${c.titulo} — ${c.eixos.join(', ')} — ${c.palavras} palavras, ${c.referencias.length} refs, ${links} links internos`);
  console.log(`          resumo: ${c.resumo.slice(0, 110)}`);
  await espera(400);
}

// Vínculos dos 97 já semeados. A data gravada é a da MIGRAÇÃO — assim os que
// foram editados depois dela entram na primeira sincronização.
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const sql = [
  '-- Gerado por scripts/testar-notion.mjs. Liga cada estudo semeado à página do Notion de onde veio.',
  ...acervo.map((a) => {
    const d = datas.get(a.id.slice(-10));
    return `update public.artigos set notion_id = ${q(comTracos(a.id))}, notion_editado_em = ${d ? q(new Date(d.editado).toISOString()) : 'null'} where slug = ${q(slugDoAcervo.get(comTracos(a.id)))} and notion_id is null;`;
  }),
  "select count(*) filter (where notion_id is not null) as ligados, count(*) as total from public.artigos;",
];
writeFileSync(join(RAIZ, 'sql', '10-notion-vinculos.sql'), sql.join('\n') + '\n', 'utf8');
console.log(`\nsql/10-notion-vinculos.sql: ${acervo.length} vínculos`);
