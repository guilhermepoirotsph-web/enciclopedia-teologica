/**
 * Teste do conversor da API oficial do Notion com uma página de exemplo (sem rede).
 *   node scripts/testar-notion-oficial.mjs
 */
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
const M = await import(pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'functions', 'sincronizar-notion', 'index.ts')).href);
const P = '3384e5cd-32c9-8099-ab85-de323f444ae4';
const JOSIAS = '3384e5cd-32c9-80a2-8b99-e97877a55a9f';
const rt = (t, a = {}, extra = {}) => ({ type: 'text', plain_text: t, annotations: { bold: false, italic: false, code: false, strikethrough: false, ...a }, ...extra });
const filhos = {
  [P]: [
    { id: 'h1', type: 'heading_1', heading_1: { rich_text: [rt('Título')] } },
    { id: 'p1', type: 'paragraph', paragraph: { rich_text: [rt('Texto '), rt('negrito', { bold: true }), rt(' e '), rt('link', {}, { href: 'https://exemplo.com' }), rt(' e veja '), { type: 'mention', plain_text: 'Josias Rei de Judá', annotations: {}, mention: { type: 'page', page: { id: JOSIAS } } }, rt('.')] } },
    { id: 'b1', type: 'bulleted_list_item', has_children: true, bulleted_list_item: { rich_text: [rt('Item com '), rt('itálico', { italic: true })] } },
    { id: 'q1', type: 'quote', quote: { rich_text: [rt('Porque Deus amou o mundo.')] } },
    { id: 'c1', type: 'code', code: { rich_text: [rt('print("oi")')], language: 'python' } },
    { id: 'd1', type: 'divider', divider: {} },
    { id: 'i1', type: 'image', image: { type: 'file', file: { url: 'https://arquivos.notion/imagem.png' } } },
    { id: 'cp1', type: 'child_page', has_children: false, child_page: { title: 'Subpágina' } },
    { id: 'h2', type: 'heading_2', heading_2: { rich_text: [rt('Seção')] } },
  ],
  b1: [{ id: 'b1a', type: 'paragraph', paragraph: { rich_text: [rt('Filho do item.')] } }],
};
const buscar = async (id) => filhos[id] ?? [];
const blocos = await M.arvoreOficialDe(P, buscar);
const paginas = new Map([[JOSIAS, { slug: 'josias-rei-de-juda', titulo: 'Josias Rei de Judá' }]]);
const md = M.renderizar(blocos, P, { formatar: true, paginas });
console.log(md);
console.log('---');
console.log('converterRico sem formatação:', JSON.stringify(M.converterRicoOficial([rt('x', { bold: true })])));
console.log('blocos gerados:', Object.keys(blocos).length);
