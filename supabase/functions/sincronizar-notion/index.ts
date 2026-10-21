/**
 * Sincroniza a base "Central de Artigos" do Notion do autor com a tabela
 * `artigos` do site. Roda como Edge Function do Supabase (pg_cron a cada 30
 * minutos + botão no painel) e também importa no Node para o teste local
 * (`scripts/testar-notion.mjs`) — por isso não importa nada de Deno nem de npm.
 *
 * DECISÕES (Guilherme, 20/10/2026):
 *  - O Notion manda no TEXTO. Título, ícone, eixos, corpo, resumo, referências
 *    e datas vêm de lá; edição de texto feita no painel é substituída quando o
 *    estudo mudar no Notion.
 *  - O painel manda no resto: Núcleo (premium), publicado, capa e slug. A
 *    sincronização NUNCA desliga o Núcleo nem republica o que o autor ocultou.
 *  - Leitura pelo LINK PÚBLICO da base (a página está publicada na web), sem
 *    token. É a API interna do Notion: se ela mudar, a função falha alto e o
 *    painel mostra o erro — nunca apaga nada por causa de uma resposta vazia.
 *  - O que ele VENDE fica bloqueado: estudo cujo slug é igual ao de uma obra do
 *    Núcleo (ex.: "Epístola às Denominações Evangélicas do Brasil", R$ 5 na
 *    Hotmart) vira premium sozinho — o corpo só sai pela função `ler_artigo`,
 *    que corta para quem não é membro.
 */

const BASE_PADRAO = '3384e5cd-32c9-8099-ab85-de323f444ae4';
const NOTION = 'https://www.notion.so/api/v3';
/** Páginas convertidas por execução — o resto fica para a próxima rodada. */
const LOTE = 25;
/** Intervalo mínimo entre execuções (cron e botão do painel). */
const ESPERA_MS = 60_000;
/** Tempo máximo de conversão por execução (a função tem limite de ~150 s). O resto espera a próxima. */
const TEMPO_MAX_MS = 100_000;
const AGENTE = 'EnciclopediaTeologica-sync/1.0 (+https://enciclopedia-teologica.pages.dev)';

/**
 * Segredo da função. Em produção vem de `supabase secrets` / painel do Supabase
 * (nome NOTION_TOKEN) e nunca passa pelo código nem pelo chat. No teste local,
 * vem do ambiente do Node.
 */
function segredo(nome: string): string | undefined {
  const g = globalThis as unknown as {
    Deno?: { env?: { get(k: string): string | undefined } };
    process?: { env?: Record<string, string | undefined> };
  };
  return g.Deno?.env?.get(nome) ?? g.process?.env?.[nome] ?? undefined;
}

/* ================================================================ Notion */

type Registro = { value?: { value?: Bloco } & Partial<Bloco> };
type Bloco = {
  id: string;
  type?: string;
  alive?: boolean;
  space_id?: string;
  collection_id?: string;
  view_ids?: string[];
  content?: string[];
  properties?: Record<string, Rico>;
  created_time?: number;
  last_edited_time?: number;
};
/** Texto rico interno do Notion: [[texto, [[marca, arg?]...]?]...] */
type Rico = [string, string[][]?][];

export type Linha = { id: string; titulo: string; categorias: string[]; criado: number; editado: number };

const valor = (r: Registro | undefined): Bloco | undefined => (r?.value?.value ?? r?.value) as Bloco | undefined;

export function comTracos(id: string) {
  const h = id.replace(/-/g, '').toLowerCase();
  return h.length === 32 ? h.replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5') : id;
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Uma chamada à API interna. O Notion limita a frequência (429): espera o que
 * ele pedir em Retry-After (ou 2 s, 5 s, 10 s) e tenta de novo, até 4 vezes.
 */
async function notion(caminho: string, corpo: unknown) {
  for (let tentativa = 0; ; tentativa++) {
    const r = await fetch(`${NOTION}/${caminho}`, {
      method: 'POST',
      // User-agent próprio e honesto: o Notion recusa (403) o "node" padrão do fetch.
      headers: { 'content-type': 'application/json', 'user-agent': 'EnciclopediaTeologica-sync/1.0 (+https://enciclopedia-teologica.pages.dev)' },
      body: JSON.stringify(corpo),
    });
    if (r.ok) return r.json();
    if ((r.status === 429 || r.status >= 500) && tentativa < 4) {
      const pedido = Number(r.headers.get('retry-after'));
      await dormir(Number.isFinite(pedido) && pedido > 0 ? Math.min(pedido, 30) * 1000 : [2000, 5000, 10000, 15000][tentativa]);
      continue;
    }
    throw new Error(`Notion ${caminho} respondeu HTTP ${r.status}`);
  }
}

/** Todas as linhas da base, com título, categorias e datas do bloco. */
async function listarBaseInterna(baseId: string): Promise<Linha[]> {
  const id = comTracos(baseId);
  const pc = await notion('loadPageChunk', { pageId: id, limit: 5, cursor: { stack: [] }, chunkNumber: 0, verticalColumns: false });
  const base = valor(pc.recordMap?.block?.[id]);
  if (!base?.collection_id) throw new Error('A base do Notion não respondeu — ela continua publicada na web?');

  const colecao = valor(pc.recordMap?.collection?.[base.collection_id]) as unknown as { schema?: Record<string, { name: string; type: string }> };
  const chaveCategoria = Object.entries(colecao?.schema ?? {}).find(
    ([, s]) => s.type === 'multi_select' && /categoria/i.test(s.name)
  )?.[0];

  const q = await notion('queryCollection', {
    collection: { id: base.collection_id, spaceId: base.space_id },
    collectionView: { id: base.view_ids?.[0], spaceId: base.space_id },
    loader: {
      type: 'reducer',
      reducers: { collection_group_results: { type: 'results', limit: 2000 } },
      searchQuery: '',
      userTimeZone: 'America/Sao_Paulo',
    },
  });
  const ids: string[] = q.result?.reducerResults?.collection_group_results?.blockIds ?? [];
  const blocos = q.recordMap?.block ?? {};

  return ids
    .map((pid) => valor(blocos[pid]))
    .filter((b): b is Bloco => Boolean(b) && b!.alive !== false)
    .map((b) => ({
      id: b.id,
      titulo: plano(b.properties?.title),
      categorias: plano(chaveCategoria ? b.properties?.[chaveCategoria] : undefined)
        .split(/\s*,\s*/)
        .map((c) => c.trim())
        .filter(Boolean),
      criado: b.created_time ?? 0,
      editado: b.last_edited_time ?? b.created_time ?? 0,
    }));
}

/* ===================================================== API oficial (token) */

const API_OFICIAL = 'https://api.notion.com/v1';
/** Versão que mantém a consulta de base (`databases/{id}/query`). */
const VERSAO_API = '2022-06-28';
let ultimaChamadaOficial = 0;

/**
 * Uma chamada à API oficial. Espaça as chamadas (o Notion aceita ~3 por segundo),
 * respeita Retry-After no 429 e nunca escreve o token em mensagem de erro.
 */
export async function oficial(caminho: string, token: string, metodo: 'GET' | 'POST' = 'GET', corpo?: unknown): Promise<any> {
  for (let tentativa = 0; ; tentativa++) {
    const falta = ultimaChamadaOficial + 340 - Date.now();
    if (falta > 0) await dormir(falta);
    ultimaChamadaOficial = Date.now();
    const r = await fetch(`${API_OFICIAL}/${caminho}`, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': VERSAO_API,
        'Content-Type': 'application/json',
        'user-agent': AGENTE,
      },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    if (r.ok) return r.json();
    if ((r.status === 429 || r.status >= 500) && tentativa < 5) {
      const pedido = Number(r.headers.get('retry-after'));
      await dormir(Number.isFinite(pedido) && pedido > 0 ? Math.min(pedido, 30) * 1000 : 1000 * 2 ** tentativa);
      continue;
    }
    const detalhe = await r.text().catch(() => '');
    const dica =
      r.status === 401 || r.status === 403
        ? ' — confira o token e se a integração "Site Enciclopédia" está conectada à Central de Artigos'
        : '';
    throw new Error(`API do Notion (${caminho.split('?')[0]}) respondeu HTTP ${r.status}${dica}: ${detalhe.slice(0, 160)}`);
  }
}

/** Filhos diretos de um bloco/página, todas as páginas da resposta. */
async function filhosOficiais(id: string, token: string): Promise<any[]> {
  const todos: any[] = [];
  let cursor: string | undefined;
  do {
    const r = await oficial(`blocks/${id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`, token);
    todos.push(...(r.results ?? []));
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return todos.filter((b) => !b.archived && !b.in_trash);
}

/** Acha a base de artigos dentro da página "Central de Artigos" (até 3 níveis). */
async function acharBase(paginaId: string, token: string): Promise<string> {
  // Caso comum na "Central de Artigos": a própria página é o banco (visão de banco
  // em página inteira, link com ?v=). Então o id da página já serve para consultar.
  try {
    const banco = await oficial(`databases/${paginaId}`, token);
    if (banco?.object === 'database') return banco.id;
  } catch (e) {
    if (!/HTTP 404/.test((e as Error).message)) throw e;
  }

  const achadas: { id: string; titulo: string }[] = [];
  const fila: { id: string; nivel: number }[] = [{ id: paginaId, nivel: 0 }];
  while (fila.length) {
    const { id, nivel } = fila.shift()!;
    for (const b of await filhosOficiais(id, token)) {
      if (b.type === 'child_database') achadas.push({ id: b.id, titulo: plano(b.child_database?.title ? [[b.child_database.title]] : undefined) });
      else if (b.has_children && nivel < 3) fila.push({ id: b.id, nivel: nivel + 1 });
    }
    if (achadas.length) break;
  }
  if (!achadas.length) {
    throw new Error('Não achei a base "Central de Artigos" dentro da página. Confira se a integração "Site Enciclopédia" está conectada a ela (⋯ → Conexões).');
  }
  return (achadas.find((a) => /artigo|central/i.test(a.titulo)) ?? achadas[0]).id;
}

async function listarBaseOficial(paginaId: string, token: string): Promise<Linha[]> {
  const dbId = await acharBase(paginaId, token);
  const linhas: Linha[] = [];
  let cursor: string | undefined;
  do {
    const r = await oficial(`databases/${dbId}/query`, token, 'POST', { page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) });
    for (const p of r.results ?? []) {
      if (p.archived || p.in_trash) continue;
      const props = p.properties ?? {};
      const chaveTitulo = Object.keys(props).find((k) => props[k]?.type === 'title') ?? '';
      const chaveCategoria = Object.keys(props).find((k) => props[k]?.type === 'multi_select' && /categoria/i.test(k)) ?? '';
      linhas.push({
        id: p.id,
        titulo: (props[chaveTitulo]?.title ?? []).map((t: any) => t.plain_text ?? '').join(''),
        categorias: (props[chaveCategoria]?.multi_select ?? []).map((o: any) => o.name as string),
        criado: Date.parse(p.created_time) || 0,
        editado: Date.parse(p.last_edited_time) || 0,
      });
    }
    cursor = r.has_more ? r.next_cursor : undefined;
  } while (cursor);
  return linhas;
}

/** Tipo da API oficial → tipo que o conversor já entende (o mesmo da API interna). */
const TIPOS_OFICIAIS: Record<string, string> = {
  heading_1: 'header',
  heading_2: 'sub_header',
  heading_3: 'sub_sub_header',
  paragraph: 'text',
  bulleted_list_item: 'bulleted_list',
  numbered_list_item: 'numbered_list',
  quote: 'quote',
  callout: 'callout',
  toggle: 'toggle',
  code: 'code',
  divider: 'divider',
  image: 'image',
  child_page: 'page',
};

/** Texto rico da API oficial → formato interno: [[texto, [[marca, arg?]...]?]...]. */
export function converterRicoOficial(rt: any[] = []): Rico {
  return rt.map((t) => {
    const marcas: string[][] = [];
    const a = t.annotations ?? {};
    if (a.code) marcas.push(['c']);
    if (a.bold) marcas.push(['b']);
    if (a.italic) marcas.push(['i']);
    if (a.strikethrough) marcas.push(['s']);
    if (t.type === 'mention' && t.mention?.type === 'page') {
      marcas.push(['a', `https://www.notion.so/${String(t.mention.page.id).replace(/-/g, '')}`]);
    } else if (t.href) {
      marcas.push(['a', t.href]);
    }
    return marcas.length ? [t.plain_text ?? '', marcas] : [t.plain_text ?? ''];
  }) as unknown as Rico;
}

function propriedadesOficiais(b: any): Record<string, unknown> {
  const c = b[b.type] ?? {};
  if (b.type === 'child_page') return { title: [[c.title ?? '']] };
  if (b.type === 'image') return { source: [[c.file?.url ?? c.external?.url ?? '']] };
  return { title: converterRicoOficial(c.rich_text ?? []) };
}

/** Desce a árvore inteira de uma página e grava no formato que `renderizar` lê. */
async function arvoreOficial(id: string, buscar: (id: string) => Promise<any[]>, blocos: Record<string, Registro>): Promise<string[]> {
  const ids: string[] = [];
  for (const b of await buscar(id)) {
    ids.push(b.id);
    const bloco: Bloco = {
      id: b.id,
      type: TIPOS_OFICIAIS[b.type] ?? b.type,
      alive: true,
      content: [],
      properties: propriedadesOficiais(b) as Record<string, Rico>,
    };
    blocos[b.id] = { value: { value: bloco } };
    if (b.has_children && b.type !== 'child_page' && b.type !== 'child_database') {
      bloco.content = await arvoreOficial(b.id, buscar, blocos);
    }
  }
  return ids;
}

/** Árvore de uma página a partir de qualquer função que liste filhos (testável sem rede). */
export async function arvoreOficialDe(paginaId: string, buscar: (id: string) => Promise<any[]>): Promise<Record<string, Registro>> {
  const blocos: Record<string, Registro> = {};
  const filhos = await arvoreOficial(paginaId, buscar, blocos);
  blocos[comTracos(paginaId)] = { value: { value: { id: comTracos(paginaId), type: 'page', alive: true, content: filhos } } };
  return blocos;
}

/* ============================================================ escolha */

/**
 * Com o segredo NOTION_TOKEN: API oficial (estável, a integração só lê).
 * Sem ele: link público da base (API interna), que já funcionou na migração.
 */
export async function listarBase(baseId = BASE_PADRAO): Promise<Linha[]> {
  const token = segredo('NOTION_TOKEN');
  return token ? listarBaseOficial(baseId, token) : listarBaseInterna(baseId);
}

/** Todos os blocos de uma página, seguindo o cursor até o fim. */
export async function carregarPagina(pageId: string): Promise<Record<string, Registro>> {
  const token = segredo('NOTION_TOKEN');
  if (token) return arvoreOficialDe(pageId, (id) => filhosOficiais(id, token));
  return carregarPaginaInterna(pageId);
}

/** Todos os blocos de uma página pela API interna, seguindo o cursor até o fim. */
async function carregarPaginaInterna(pageId: string): Promise<Record<string, Registro>> {
  const blocos: Record<string, Registro> = {};
  let cursor: { stack: unknown[] } = { stack: [] };
  let n = 0;
  do {
    const r = await notion('loadPageChunk', { pageId: comTracos(pageId), limit: 400, cursor, chunkNumber: n++, verticalColumns: false });
    Object.assign(blocos, r.recordMap?.block ?? {});
    cursor = r.cursor ?? { stack: [] };
  } while (cursor.stack?.length && n < 12);
  return blocos;
}

/* ============================================================ conversão */

export const plano = (p?: Rico) => (Array.isArray(p) ? p.map((s) => s[0]).join('') : '');

/** Como achar o estudo do site a partir de um id de página do Notion. */
export type Contexto = {
  formatar: boolean;
  /** id do Notion (com traços) → { slug, titulo } */
  paginas: Map<string, { slug: string; titulo: string }>;
};

function destinoDoLink(href: string, ctx: Contexto) {
  const m = href.match(/([0-9a-f]{32})(?:[?#].*)?$/i) || href.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (m && /notion\.(so|site|com)|^\//i.test(href)) {
    const alvo = ctx.paginas.get(comTracos(m[1]));
    if (alvo) return `/artigo/${alvo.slug}`;
  }
  return href.startsWith('/') ? `https://www.notion.so${href}` : href;
}

/** Texto rico → markdown. Sem `formatar`, é exatamente o texto da migração de 12/09. */
export function rico(p: Rico | undefined, ctx: Contexto): string {
  if (!Array.isArray(p)) return '';
  if (!ctx.formatar) return plano(p);
  return p
    .map(([txt, marcas]) => {
      const fmt = new Map((marcas ?? []).map((m) => [m[0], m[1]]));

      // Menção a outra página ("‣"): vira link para o estudo, ou só o título.
      if (txt === '‣' && fmt.has('p')) {
        const alvo = ctx.paginas.get(comTracos(fmt.get('p') as string));
        return alvo ? `[${alvo.titulo}](/artigo/${alvo.slug})` : '';
      }
      if (txt === '‣') return '';

      const [, antes, miolo, depois] = txt.match(/^(\s*)([\s\S]*?)(\s*)$/) ?? ['', '', txt, ''];
      if (!miolo) return txt;
      let s = miolo;
      if (fmt.has('c')) s = '`' + s + '`';
      if (fmt.has('b') && fmt.has('i')) s = `***${s}***`;
      else if (fmt.has('b')) s = `**${s}**`;
      else if (fmt.has('i')) s = `*${s}*`;
      if (fmt.has('s')) s = `~~${s}~~`;
      if (fmt.has('a')) s = `[${s}](${destinoDoLink(String(fmt.get('a')), ctx)})`;
      return antes + s + depois;
    })
    .join('');
}

/** Árvore de blocos → markdown (mesmas regras do conversor da migração). */
export function renderizar(blocos: Record<string, Registro>, raiz: string, ctx: Contexto): string {
  const pega = (id: string) => valor(blocos[id]);
  const saida: string[] = [];
  const andar = (id: string, nivel: number) => {
    const v = pega(id);
    if (!v || v.alive === false) return;
    const t = rico(v.properties?.title, ctx);
    const pad = '  '.repeat(Math.max(0, nivel));
    switch (v.type) {
      case 'header': saida.push('\n## ' + t); break;
      case 'sub_header': saida.push('\n### ' + t); break;
      case 'sub_sub_header': saida.push('\n#### ' + t); break;
      case 'bulleted_list': saida.push(pad + '- ' + t); break;
      case 'numbered_list': saida.push(pad + '1. ' + t); break;
      case 'quote':
      case 'callout': saida.push('> ' + t); break;
      case 'toggle': saida.push('\n### ' + t); break;
      case 'code': saida.push('```\n' + plano(v.properties?.title) + '\n```'); break;
      case 'divider': saida.push('\n---\n'); break;
      case 'image': saida.push('![imagem](' + (v.properties?.source?.[0]?.[0] ?? '') + ')'); break;
      case 'text': saida.push(t); break;
      default: if (t) saida.push(t);
    }
    (v.content ?? []).forEach((c) => andar(c, nivel + 1));
  };
  (pega(comTracos(raiz))?.content ?? []).forEach((c) => andar(c, 0));
  return saida.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ============================================ normalização (gerar-conteudo) */

export const CORRIGE_EIXO: Record<string, string> = {
  'Artigos Biblícos': 'Artigos Bíblicos',
  'Pscicologia/hamartiologia': 'Psicologia/Hamartiologia',
  Solteriologia: 'Soteriologia',
  'Religião/Revelaçao': 'Religião/Revelação',
  'Igreja/Estado/Politica': 'Igreja, Estado e Política',
  Familia: 'Família',
  'Arqueologia Bíblica | Etnologia | Teologia | História Antiga': 'Arqueologia e História Antiga',
  'Conflito Psíquico/Intrapsíquico': 'Conflito Intrapsíquico',
};

export function slugificar(s: string) {
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

const RE_EMOJI = /^([\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}️⃣]+)\s*/u;

export function limparTitulo(t: string) {
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

/** Linha em branco entre blocos — sem isso um título vira parte da citação de cima. */
export function separarBlocos(md: string) {
  const ehTitulo = (l: string) => /^#{1,6}\s/.test(l);
  const ehCitacao = (l: string) => /^>\s?/.test(l);
  const ehLista = (l: string) => /^\s*([-*]|\d+\.)\s/.test(l);
  const ehRegua = (l: string) => /^-{3,}\s*$/.test(l);
  const saida: string[] = [];
  for (const linha of md.split('\n')) {
    const anterior = saida[saida.length - 1] ?? '';
    const respiro =
      anterior.trim() !== '' &&
      (ehTitulo(linha) ||
        ehRegua(linha) ||
        (ehCitacao(linha) && !ehCitacao(anterior)) ||
        (ehLista(linha) && !ehLista(anterior)) ||
        (!ehLista(linha) && ehLista(anterior) && linha.trim() !== '') ||
        (!ehCitacao(linha) && ehCitacao(anterior) && linha.trim() !== '') ||
        ehTitulo(anterior));
    if (respiro) saida.push('');
    saida.push(linha);
  }
  return saida.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

export function resumir(md: string, limite = 210) {
  for (const linha of md.split('\n')) {
    const t = linha
      .replace(/^#{1,6}\s*/, '')
      .replace(/^[-*]\s+/, '')
      .replace(/^\d+\.\s+/, '')
      .replace(/^>\s*/, '')
      .replace(/!\[.*?\]\(.*?\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      .replace(/[*_`~]/g, '')
      .trim();
    if (t.length < 60 || /^-{3,}$/.test(t) || /^https?:/.test(t)) continue;
    if (t.length <= limite) return t;
    const corte = t.slice(0, limite);
    const fim = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('; '), corte.lastIndexOf(', '));
    return (fim > 110 ? corte.slice(0, fim + 1) : corte).trim() + '…';
  }
  return '';
}

const LIVROS =
  'Gênesis|Êxodo|Levítico|Números|Deuteronômio|Josué|Juízes|Rute|Samuel|Reis|Crônicas|Esdras|Neemias|Ester|Jó|Salmos?|Provérbios|Eclesiastes|Cantares|Isaías|Jeremias|Lamentações|Ezequiel|Daniel|Oséias|Joel|Amós|Obadias|Jonas|Miquéias|Naum|Habacuque|Sofonias|Ageu|Zacarias|Malaquias|Mateus|Marcos|Lucas|João|Atos|Romanos|Coríntios|Gálatas|Efésios|Filipenses|Colossenses|Tessalonicenses|Timóteo|Tito|Filemom|Hebreus|Tiago|Pedro|Judas|Apocalipse';
const RE_REF = new RegExp('\\b((?:[1-3]|I{1,3})?\\s?(?:' + LIVROS + ')\\s+\\d{1,3}(?::\\d{1,3}(?:[-–]\\d{1,3})?)?)', 'g');

export function referencias(md: string) {
  const conta = new Map<string, number>();
  for (const r of md.match(RE_REF) || []) {
    const k = r.replace(/\s+/g, ' ').trim();
    conta.set(k, (conta.get(k) || 0) + 1);
  }
  return [...conta.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([r]) => r);
}

/** Uma linha do Notion + o corpo convertido → campos da tabela `artigos`. */
export function montar(l: Linha, mdBruto: string) {
  const { titulo, icone } = limparTitulo(l.titulo);
  const md = separarBlocos(mdBruto.replace(/^\s*-{3,}\s*\n/, '').trim());
  const palavras = md.split(/\s+/).filter(Boolean).length;
  const eixos = l.categorias.map((c) => CORRIGE_EIXO[c] || c);
  return {
    titulo,
    icone,
    eixos: eixos.length ? eixos : ['Geral'],
    resumo: resumir(md),
    corpo: md,
    referencias: referencias(md),
    palavras,
    minutos: Math.max(2, Math.round(palavras / 200)),
  };
}

/* ============================================================== banco */

type Banco = ReturnType<typeof banco>;

function banco(url: string, chave: string) {
  const cab = { apikey: chave, Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' };
  const pedir = async (metodo: string, caminho: string, corpo?: unknown, prefer?: string) => {
    const r = await fetch(`${url}/rest/v1/${caminho}`, {
      method: metodo,
      headers: prefer ? { ...cab, Prefer: prefer } : cab,
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const texto = await r.text();
    if (!r.ok) throw new Error(`${metodo} ${caminho.split('?')[0]} → HTTP ${r.status}: ${texto.slice(0, 200)}`);
    return texto ? JSON.parse(texto) : null;
  };
  return {
    ler: (c: string) => pedir('GET', c),
    inserir: (tabela: string, linhas: unknown) => pedir('POST', tabela, linhas, 'return=minimal'),
    alterar: (c: string, campos: unknown) => pedir('PATCH', c, campos, 'return=minimal'),
    config: (chave: string, valor: string) =>
      pedir('POST', 'config?on_conflict=chave', { chave, valor, publica: false }, 'resolution=merge-duplicates,return=minimal'),
  };
}

type ArtigoBanco = {
  id: string;
  slug: string;
  titulo: string;
  notion_id: string | null;
  notion_editado_em: string | null;
  notion_removido_em: string | null;
  premium: boolean;
  publicado: boolean;
};

const DESCRICAO_EIXO_NOVO = 'Estudos deste eixo vêm direto do Notion do autor.';
const iso = (ms: number) => new Date(ms || Date.now()).toISOString();

export async function sincronizar(db: Banco, agora = Date.now()) {
  const cfg = Object.fromEntries(
    ((await db.ler('config?select=chave,valor&chave=in.(notion_base,notion_sync_em)')) as { chave: string; valor: string }[]).map((c) => [c.chave, c.valor])
  );
  const ultima = Date.parse(cfg.notion_sync_em || '') || 0;
  if (agora - ultima < ESPERA_MS) {
    return { ok: true, pulado: true, mensagem: 'A última sincronização foi há menos de 1 minuto.' };
  }
  await db.config('notion_sync_em', iso(agora));

  const linhas = await listarBase(cfg.notion_base || BASE_PADRAO);
  const artigos = (await db.ler(
    'artigos?select=id,slug,titulo,notion_id,notion_editado_em,notion_removido_em,premium,publicado'
  )) as ArtigoBanco[];
  const vendidos = new Set(((await db.ler('obras?select=slug')) as { slug: string }[]).map((o) => o.slug));
  const eixosExistentes = new Set(((await db.ler('eixos?select=nome')) as { nome: string }[]).map((e) => e.nome));

  // Trava contra resposta vazia ou parcial do Notion: sem isso, uma visão filtrada
  // ou um soluço da API despublicaria o acervo inteiro de uma vez.
  const vinculados = artigos.filter((a) => a.notion_id);
  if (vinculados.length >= 10 && linhas.length < vinculados.length * 0.8) {
    throw new Error(`O Notion devolveu só ${linhas.length} estudos (o site tem ${vinculados.length} ligados). Nada foi alterado.`);
  }

  const porNotion = new Map(vinculados.map((a) => [a.notion_id as string, a]));
  const slugsUsados = new Set(artigos.map((a) => a.slug));

  // Mapa id → slug para transformar link/menção entre páginas em link do site.
  const paginas = new Map<string, { slug: string; titulo: string }>();
  const novosSlugs = new Map<string, string>();
  for (const l of linhas) {
    const existente = porNotion.get(l.id);
    let slug = existente?.slug;
    if (!slug) {
      slug = slugificar(limparTitulo(l.titulo).titulo) || 'estudo';
      while (slugsUsados.has(slug)) slug += '-2';
      slugsUsados.add(slug);
      novosSlugs.set(l.id, slug);
    }
    paginas.set(l.id, { slug, titulo: limparTitulo(l.titulo).titulo });
  }
  const ctx: Contexto = { formatar: true, paginas };

  // Tolerância de 1 minuto: as datas da migração foram gravadas em segundos e o
  // Notion responde em milissegundos — sem folga, 58 estudos que ninguém tocou
  // pareciam "editados".
  const pendentes = linhas.filter((l) => {
    const a = porNotion.get(l.id);
    return !a || !a.notion_editado_em || l.editado - Date.parse(a.notion_editado_em) > 60_000 || a.notion_removido_em;
  });

  const relatorio = {
    em: iso(agora),
    notion: linhas.length,
    novos: [] as string[],
    atualizados: [] as string[],
    bloqueados: [] as string[],
    despublicados: [] as string[],
    faltam: Math.max(0, pendentes.length - LOTE),
    erros: [] as string[],
  };
  const eixosNovos = new Set<string>();
  const inicioLote = Date.now();
  let tentados = 0;

  for (const [i, l] of pendentes.slice(0, LOTE).entries()) {
    // Tempo esgotado: o resto fica para a próxima rodada, sem perder nada.
    if (Date.now() - inicioLote > TEMPO_MAX_MS) break;
    if (i) await dormir(350); // gentileza com o limite de frequência do Notion
    tentados++;
    try {
      const existente = porNotion.get(l.id);
      const blocos = await carregarPagina(l.id);
      const campos = montar(l, renderizar(blocos, l.id, ctx));
      campos.eixos.forEach((e) => !eixosExistentes.has(e) && eixosNovos.add(e));
      const quando = { atualizado_em: iso(l.editado), notion_editado_em: iso(l.editado) };

      if (existente) {
        const extra: Record<string, unknown> = { notion_removido_em: null };
        // Voltou a existir no Notion depois de sumir: volta para o site.
        if (existente.notion_removido_em) extra.publicado = true;
        if (vendidos.has(existente.slug) && !existente.premium) {
          extra.premium = true;
          relatorio.bloqueados.push(campos.titulo);
        }
        await db.alterar(`artigos?id=eq.${existente.id}`, { ...campos, ...quando, ...extra });
        relatorio.atualizados.push(campos.titulo);
      } else {
        const slug = novosSlugs.get(l.id) as string;
        const premium = vendidos.has(slug);
        await db.inserir('artigos', {
          slug,
          ...campos,
          ...quando,
          criado_em: iso(l.criado),
          notion_id: l.id,
          premium,
          publicado: true,
        });
        relatorio.novos.push(campos.titulo);
        if (premium) relatorio.bloqueados.push(campos.titulo);
      }
    } catch (e) {
      relatorio.erros.push(`${l.titulo}: ${(e as Error).message}`);
    }
  }

  relatorio.faltam = pendentes.length - tentados;

  // Obra nova no Núcleo com o mesmo nome de um estudo já ligado → bloqueia já.
  for (const a of vinculados) {
    if (vendidos.has(a.slug) && !a.premium && !relatorio.bloqueados.includes(a.titulo)) {
      await db.alterar(`artigos?id=eq.${a.id}`, { premium: true });
      relatorio.bloqueados.push(a.titulo);
    }
  }

  for (const nome of eixosNovos) {
    await db.inserir('eixos', { slug: slugificar(nome), nome, descricao: DESCRICAO_EIXO_NOVO, ordem: 100 });
  }

  // Apagado (ou arquivado) no Notion → sai do site, mas nunca é apagado do banco.
  const presentes = new Set(linhas.map((l) => l.id));
  for (const a of vinculados) {
    if (!presentes.has(a.notion_id as string) && a.publicado && !a.notion_removido_em) {
      await db.alterar(`artigos?id=eq.${a.id}`, { publicado: false, notion_removido_em: iso(agora) });
      relatorio.despublicados.push(a.titulo);
    }
  }

  await db.config('notion_sync_relatorio', JSON.stringify(relatorio));
  return { ok: relatorio.erros.length === 0, ...relatorio };
}

/* ======================================================= Edge Function */

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type DenoMinimo = { env: { get(k: string): string | undefined }; serve(h: (r: Request) => Promise<Response>): void };
const D = (globalThis as unknown as { Deno?: DenoMinimo }).Deno;

if (D) {
  D.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
    if (req.method !== 'POST') return new Response('use POST', { status: 405, headers: CORS });
    try {
      const db = banco(D.env.get('SUPABASE_URL')!, D.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
      const r = await sincronizar(db);
      return new Response(JSON.stringify(r), { headers: { ...CORS, 'Content-Type': 'application/json' } });
    } catch (e) {
      const erro = (e as Error).message;
      try {
        const db = banco(D.env.get('SUPABASE_URL')!, D.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
        await db.config('notion_sync_relatorio', JSON.stringify({ em: new Date().toISOString(), erro }));
      } catch { /* sem banco, só devolve o erro */ }
      return new Response(JSON.stringify({ ok: false, erro }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } });
    }
  });
}
