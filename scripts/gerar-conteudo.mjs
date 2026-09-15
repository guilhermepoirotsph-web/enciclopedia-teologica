/**
 * Transforma o acervo bruto exportado do Notion (_acervo/acervo.json)
 * no conteúdo que o site consome:
 *   public/conteudo/indice.json         -> catálogo leve (sem corpo)
 *   public/conteudo/eixos.json          -> eixos temáticos (categorias)
 *   public/conteudo/artigos/<slug>.json -> corpo de cada artigo
 *   sql/02-seed.sql                     -> mesmo acervo para o Supabase
 *
 * O corpo fica fora do bundle de propósito: 650 KB de texto não precisam
 * atravessar o JS da primeira tela.
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const bruto = JSON.parse(readFileSync(join(RAIZ, '_acervo', 'acervo.json'), 'utf8'));

// As datas de criação/edição moram no bloco do Notion, não nas propriedades da
// base — por isso vêm num arquivo à parte, casado pelos 10 últimos dígitos do id.
const DATAS = new Map(
  readFileSync(join(RAIZ, '_acervo', 'datas.txt'), 'utf8')
    .trim()
    .split(/[;\n]/)
    .filter(Boolean)
    .map((l) => {
      const [id, criado, editado] = l.trim().split(',');
      return [id, [new Date(+criado * 1000).toISOString(), new Date(+editado * 1000).toISOString()]];
    })
);

/* ---------- normalizações ---------- */

// Erros de digitação nos RÓTULOS de categoria. O original de cada artigo fica
// guardado em `eixoOrigem` para o Eleno poder reverter pelo painel se discordar.
const CORRIGE_EIXO = {
  'Artigos Biblícos': 'Artigos Bíblicos',
  'Pscicologia/hamartiologia': 'Psicologia/Hamartiologia',
  Solteriologia: 'Soteriologia',
  'Religião/Revelaçao': 'Religião/Revelação',
  'Igreja/Estado/Politica': 'Igreja, Estado e Política',
  Familia: 'Família',
  'Arqueologia Bíblica | Etnologia | Teologia | História Antiga': 'Arqueologia e História Antiga',
  'Conflito Psíquico/Intrapsíquico': 'Conflito Intrapsíquico',
};

// Cada eixo ganha uma linha de apoio para o leitor saber o que vai encontrar.
const DESCRICAO_EIXO = {
  'Religião/Revelação': 'Revelação, religiões comparadas e o que as Escrituras afirmam sobre elas.',
  'Artigos Bíblicos': 'Exposição de textos e livros da Bíblia, capítulo a capítulo.',
  Sociedade: 'A fé diante da cultura, do trabalho, do dinheiro e do debate público.',
  'Igreja, Estado e Política': 'Os limites entre o púlpito e o poder, à luz das Escrituras.',
  Escatologia: 'Últimas coisas: arrebatamento, dispensações, eternidade e destino.',
  Historicidade: 'Contexto histórico, cronologia e evidência do relato bíblico.',
  Tradicionalismo: 'O que é mandamento e o que é apenas costume herdado.',
  'Família': 'Casamento, filhos, masculinidade e feminilidade sob a ótica cristã.',
  Teodiceia: 'A origem do mal, o livre-arbítrio e a justiça de Deus.',
  Eclesiologia: 'A natureza, a missão e as distorções da Igreja.',
  Hamartiologia: 'A doutrina do pecado e a mecânica da redenção.',
  Antropologia: 'O que é o ser humano: corpo, alma, espírito e vocação.',
  'Conflito Intrapsíquico': 'Mente, identidade e os embates interiores do ser.',
  'Crise existencial': 'Dor, sentido e esperança quando a vida perde o eixo.',
  'Psicologia/Hamartiologia': 'Onde o comportamento humano encontra a doutrina do pecado.',
  'Arqueologia e História Antiga': 'Achados, povos e cronologias que tocam o texto sagrado.',
  Legalismo: 'Quando a regra ocupa o lugar da graça.',
  Esoterismo: 'Ocultismo e misticismo examinados pela Palavra.',
  Heresiologia: 'O que distingue a Igreja de uma seita.',
  Sabedoria: 'Provérbios, discernimento e a leitura sábia da criação.',
  Bibliologia: 'A formação, a transmissão e a estrutura das Escrituras.',
  'Fatos emblemáticos': 'Episódios bíblicos que costumam gerar as perguntas mais difíceis.',
  Cultura: 'Símbolos, arte e narrativas que moldam a imaginação da época.',
  Biografia: 'Vidas bíblicas lidas de ponta a ponta.',
  'Definições': 'Verbetes curtos para os termos que o estudo exige.',
  Entretenimento: 'Consumo, atenção e o que a distração faz com a alma.',
  Poesia: 'Texto autoral em forma poética.',
  Pneumatologia: 'A pessoa e a atuação do Espírito Santo.',
  'Evangelização': 'Como se anuncia o Evangelho sem desfigurá-lo.',
  Soteriologia: 'A doutrina da salvação: alcance, condição e permanência.',
  Juventude: 'A geração nova diante da fé, da pressão e do propósito.',
  Geral: 'Estudos que não cabem num único eixo.',
};

const MESES = {
  janeiro: 1, fevereiro: 2, 'março': 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

function paraISO(txt) {
  if (!txt) return null;
  const m = String(txt).match(/(\d{1,2}) de ([a-zç]+) de (\d{4})(?:\s+(\d{1,2}):(\d{2}))?/i);
  if (!m) return null;
  const mes = MESES[m[2].toLowerCase()];
  if (!mes) return null;
  // Notion entrega no fuso de São Paulo; guardamos em UTC.
  return new Date(Date.UTC(+m[3], mes - 1, +m[1], +(m[4] || 0) + 3, +(m[5] || 0))).toISOString();
}

function slugificar(s) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70);
}

// Emoji que o Eleno usa como marcador no começo do título vira ícone do card.
const RE_EMOJI = /^([\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}️⃣]+)\s*/u;

function limparTitulo(t) {
  let titulo = t.replace(/\s+/g, ' ').trim();
  let icone = '';
  const m = titulo.match(RE_EMOJI);
  if (m) {
    icone = m[1].replace(/️/g, '');
    titulo = titulo.slice(m[0].length);
  }
  titulo = titulo.replace(/[:：]\s*$/, '').trim();
  return { titulo, icone };
}

/**
 * Separa os blocos com linha em branco.
 *
 * O Notion entrega um bloco por linha, sem linha vazia entre eles. Em markdown
 * isso é "continuação preguiçosa": um título logo abaixo de uma citação é
 * engolido pela citação, e o leitor vê o título virar parte do versículo. Já
 * aconteceu exatamente isso no estudo de Josias.
 */
function separarBlocos(md) {
  const ehTitulo = (l) => /^#{1,6}\s/.test(l);
  const ehCitacao = (l) => /^>\s?/.test(l);
  const ehLista = (l) => /^\s*([-*]|\d+\.)\s/.test(l);
  const ehRegua = (l) => /^-{3,}\s*$/.test(l);

  const saida = [];
  for (const linha of md.split('\n')) {
    const anterior = saida[saida.length - 1] ?? '';
    const precisaRespiro =
      anterior.trim() !== '' &&
      (ehTitulo(linha) ||
        ehRegua(linha) ||
        (ehCitacao(linha) && !ehCitacao(anterior)) ||
        (ehLista(linha) && !ehLista(anterior)) ||
        (!ehLista(linha) && ehLista(anterior) && linha.trim() !== '') ||
        (!ehCitacao(linha) && ehCitacao(anterior) && linha.trim() !== '') ||
        ehTitulo(anterior));
    if (precisaRespiro) saida.push('');
    saida.push(linha);
  }
  return saida.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Primeira frase de corpo real, para o resumo do card. */
function resumir(md, limite = 210) {
  for (const linha of md.split('\n')) {
    const t = linha
      .replace(/^#{1,6}\s*/, '')
      .replace(/^[-*]\s+/, '')
      .replace(/^\d+\.\s+/, '')
      .replace(/^>\s*/, '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/[*_`]/g, '')
      .trim();
    if (t.length < 60 || /^-{3,}$/.test(t) || /^https?:/.test(t)) continue;
    if (t.length <= limite) return t;
    const corte = t.slice(0, limite);
    const fim = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('; '), corte.lastIndexOf(', '));
    return (fim > 110 ? corte.slice(0, fim + 1) : corte).trim() + '…';
  }
  return '';
}

/** Referências bíblicas citadas — vira metadado de busca e selo no card. */
const LIVROS =
  'Gênesis|Êxodo|Levítico|Números|Deuteronômio|Josué|Juízes|Rute|Samuel|Reis|Crônicas|Esdras|Neemias|Ester|Jó|Salmos?|Provérbios|Eclesiastes|Cantares|Isaías|Jeremias|Lamentações|Ezequiel|Daniel|Oséias|Joel|Amós|Obadias|Jonas|Miquéias|Naum|Habacuque|Sofonias|Ageu|Zacarias|Malaquias|Mateus|Marcos|Lucas|João|Atos|Romanos|Coríntios|Gálatas|Efésios|Filipenses|Colossenses|Tessalonicenses|Timóteo|Tito|Filemom|Hebreus|Tiago|Pedro|Judas|Apocalipse';
const RE_REF = new RegExp(
  '\\b((?:[1-3]|I{1,3})?\\s?(?:' + LIVROS + ')\\s+\\d{1,3}(?::\\d{1,3}(?:[-–]\\d{1,3})?)?)',
  'g'
);

function referencias(md) {
  const conta = new Map();
  for (const r of md.match(RE_REF) || []) {
    const k = r.replace(/\s+/g, ' ').trim();
    conta.set(k, (conta.get(k) || 0) + 1);
  }
  return [...conta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([r]) => r);
}

/* ---------- montagem ---------- */

const usados = new Set();
const artigos = bruto.map((a) => {
  const { titulo, icone } = limparTitulo(a.titulo);
  let slug = slugificar(titulo);
  while (usados.has(slug)) slug += '-2';
  usados.add(slug);

  const eixos = (a.categoria || '')
    .split(/\s*,\s*/)
    .map((c) => c.trim())
    .filter(Boolean)
    .map((c) => CORRIGE_EIXO[c] || c);
  if (!eixos.length) eixos.push('Geral');

  const md = separarBlocos(a.md.replace(/^\s*-{3,}\s*\n/, '').trim());
  const palavras = md.split(/\s+/).filter(Boolean).length;
  const [criado, editado] = DATAS.get(a.id.slice(-10)) || [];

  return {
    slug,
    titulo,
    icone,
    eixos,
    eixoOrigem: a.categoria || '',
    resumo: resumir(md),
    criado: criado || paraISO(a.criado),
    atualizado: editado || criado || paraISO(a.atualizado),
    palavras,
    minutos: Math.max(2, Math.round(palavras / 200)),
    referencias: referencias(md),
    premium: false,
    publicado: true,
    md,
  };
});

artigos.sort((a, b) => (b.atualizado || '').localeCompare(a.atualizado || ''));

const mapaEixos = new Map();
for (const a of artigos) {
  for (const e of a.eixos) {
    if (!mapaEixos.has(e)) {
      mapaEixos.set(e, { nome: e, slug: slugificar(e), descricao: DESCRICAO_EIXO[e] || '', total: 0 });
    }
    mapaEixos.get(e).total++;
  }
}
const eixos = [...mapaEixos.values()].sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));

/* ---------- gravação ---------- */

const dirArtigos = join(RAIZ, 'public', 'conteudo', 'artigos');
rmSync(dirArtigos, { recursive: true, force: true });
mkdirSync(dirArtigos, { recursive: true });

const indice = artigos.map(({ md, ...resto }) => resto);
writeFileSync(join(RAIZ, 'public', 'conteudo', 'indice.json'), JSON.stringify(indice), 'utf8');
writeFileSync(join(RAIZ, 'public', 'conteudo', 'eixos.json'), JSON.stringify(eixos), 'utf8');

// REGRA DE SEGURANÇA: corpo de artigo do Núcleo NUNCA vai para /conteudo.
// Arquivo em /public é servido a qualquer um que souber o endereço — não existe
// "cortar depois" num JSON público. Conteúdo pago só existe no banco, atrás da
// função que confere a assinatura no servidor.
let retidos = 0;
for (const a of artigos) {
  if (a.premium || !a.publicado) {
    retidos++;
    continue;
  }
  writeFileSync(join(dirArtigos, a.slug + '.json'), JSON.stringify(a), 'utf8');
}

/* ---------- sitemap ---------- */

// Trocar quando o domínio definitivo existir; até lá o sitemap já sai pronto.
const DOMINIO = 'https://' + (process.env.DOMINIO || 'enciclopediateologica.com.br').replace(/^https?:///, '');
const url = (caminho, data, prio) =>
  `  <url><loc>${DOMINIO}${caminho}</loc>${data ? `<lastmod>${data.slice(0, 10)}</lastmod>` : ''}<priority>${prio}</priority></url>`;

writeFileSync(
  join(RAIZ, 'public', 'sitemap.xml'),
  [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    url('/', artigos[0]?.atualizado, '1.0'),
    url('/biblioteca', artigos[0]?.atualizado, '0.9'),
    url('/eixos', null, '0.7'),
    url('/nucleo', null, '0.7'),
    url('/livro', null, '0.7'),
    url('/autor', null, '0.6'),
    url('/apoie', null, '0.5'),
    url('/contato', null, '0.5'),
    ...eixos.map((e) => url('/eixo/' + e.slug, null, '0.6')),
    // Artigo do Núcleo não entra no sitemap: o buscador acharia só a prévia.
    ...artigos.filter((a) => a.publicado && !a.premium).map((a) => url('/artigo/' + a.slug, a.atualizado, '0.8')),
    '</urlset>',
  ].join('\n'),
  'utf8'
);

/* ---------- seed SQL ---------- */

const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const arr = (a) => 'ARRAY[' + a.map(q).join(',') + ']::text[]';
const linhas = [
  '-- Gerado por scripts/gerar-conteudo.mjs a partir do acervo do Notion. Nao editar a mao.',
  '-- Roda depois de 01-schema.sql. Reexecutavel: usa ON CONFLICT (slug).',
  'begin;',
  '',
  '-- eixos tematicos',
  ...eixos.map(
    (e, i) =>
      `insert into public.eixos (slug, nome, descricao, ordem) values (${q(e.slug)}, ${q(e.nome)}, ${q(e.descricao)}, ${i})\n  on conflict (slug) do update set nome = excluded.nome, descricao = excluded.descricao, ordem = excluded.ordem;`
  ),
  '',
  '-- artigos',
  ...artigos.map(
    (a) =>
      `insert into public.artigos (slug, titulo, icone, eixos, resumo, corpo, referencias, palavras, minutos, premium, publicado, criado_em, atualizado_em)\n` +
      `  values (${q(a.slug)}, ${q(a.titulo)}, ${q(a.icone)}, ${arr(a.eixos)}, ${q(a.resumo)}, ${q(a.md)}, ${arr(a.referencias)}, ${a.palavras}, ${a.minutos}, false, true, ${q(a.criado || new Date().toISOString())}, ${q(a.atualizado || new Date().toISOString())})\n` +
      `  on conflict (slug) do update set titulo = excluded.titulo, icone = excluded.icone, eixos = excluded.eixos, resumo = excluded.resumo, corpo = excluded.corpo, referencias = excluded.referencias, palavras = excluded.palavras, minutos = excluded.minutos, atualizado_em = excluded.atualizado_em;`
  ),
  '',
  'commit;',
];
writeFileSync(join(RAIZ, 'sql', '02-seed.sql'), linhas.join('\n'), 'utf8');

/* ---------- relatório ---------- */

console.log('artigos      ' + artigos.length);
console.log('eixos        ' + eixos.length);
console.log('palavras     ' + artigos.reduce((s, a) => s + a.palavras, 0).toLocaleString('pt-BR'));
console.log('sem resumo   ' + artigos.filter((a) => !a.resumo).length);
console.log('corpo retido ' + retidos + '  (Nucleo ou rascunho: nao vao para /public)');
console.log('sem data     ' + artigos.filter((a) => !a.atualizado).length);
console.log('periodo      ' + artigos[artigos.length - 1].atualizado?.slice(0, 10) + ' -> ' + artigos[0].atualizado?.slice(0, 10));
console.log('seed SQL     ' + (linhas.join('\n').length / 1024).toFixed(0) + ' KB');
