import { supabase, temBanco } from './supabase';
import { lerRascunho } from './rascunho';
import type { Artigo, ArtigoCompleto, Eixo, Obra } from './tipos';

/**
 * Fonte única de conteúdo.
 *
 * Duas origens, mesma interface:
 *   1. Supabase, quando o banco estiver ligado (supabase.ts preenchido);
 *   2. o acervo publicado em /conteudo, gerado por scripts/gerar-conteudo.mjs.
 *
 * A origem 2 é o que mantém o site inteiro de pé antes de existir banco — e
 * continua sendo a rede de segurança se o banco cair: a biblioteca não some.
 */

const cache = new Map<string, unknown>();

async function json<T>(url: string): Promise<T> {
  if (cache.has(url)) return cache.get(url) as T;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} respondeu ${r.status}`);
  const d = (await r.json()) as T;
  cache.set(url, d);
  return d;
}

/* ----------------------------------------------------------------- eixos */

export async function listarEixos(): Promise<Eixo[]> {
  if (temBanco) {
    const { data, error } = await supabase!.from('eixos_publicos').select('*').order('ordem');
    if (!error && data?.length) return data as Eixo[];
  }
  return json<Eixo[]>('/conteudo/eixos.json');
}

/* --------------------------------------------------------------- artigos */

export async function listarArtigos(): Promise<Artigo[]> {
  if (temBanco) {
    const { data, error } = await supabase!
      .from('artigos_publicos')
      .select('slug,titulo,icone,eixos,resumo,criado_em,atualizado_em,palavras,minutos,premium,capa')
      .order('atualizado_em', { ascending: false });
    if (!error && data?.length) {
      return (data as Record<string, unknown>[]).map((a) => ({
        slug: a.slug as string,
        titulo: a.titulo as string,
        icone: (a.icone as string) ?? '',
        eixos: (a.eixos as string[]) ?? [],
        resumo: (a.resumo as string) ?? '',
        criado: (a.criado_em as string) ?? null,
        atualizado: (a.atualizado_em as string) ?? null,
        palavras: (a.palavras as number) ?? 0,
        minutos: (a.minutos as number) ?? 3,
        referencias: [],
        premium: Boolean(a.premium),
        publicado: true,
        capa: (a.capa as string) ?? null,
      }));
    }
  }
  // Sem banco, o rascunho do painel vale para o site também: se o autor marcou
  // um estudo como Núcleo na prévia, a prévia tem que mostrar o muro. Um modo de
  // demonstração que não reflete o que foi mexido não demonstra nada.
  const base = await json<Artigo[]>('/conteudo/indice.json');
  const r = lerRascunho();
  return base.map((a) => ({ ...a, ...(r.artigos[a.slug] ?? {}) })).filter((a) => a.publicado !== false);
}

/** Onde cortar um texto do Núcleo para quem não é membro: fim de parágrafo. */
function previa(md: string, minimo = 900) {
  if (md.length <= minimo) return md;
  const corte = md.indexOf('\n\n', minimo);
  return md.slice(0, corte > 0 ? corte : minimo).trim();
}

export async function lerArtigo(slug: string): Promise<ArtigoCompleto | null> {
  if (temBanco) {
    // A função decide sozinha, no servidor, se devolve o corpo inteiro ou só a
    // prévia — quem manda é a assinatura de quem chamou, nunca o front.
    const { data, error } = await supabase!.rpc('ler_artigo', { p_slug: slug });
    const linha = Array.isArray(data) ? data[0] : data;
    if (!error && linha) {
      return {
        slug: linha.slug,
        titulo: linha.titulo,
        icone: linha.icone ?? '',
        eixos: linha.eixos ?? [],
        resumo: linha.resumo ?? '',
        criado: linha.criado_em ?? null,
        atualizado: linha.atualizado_em ?? null,
        palavras: linha.palavras ?? 0,
        minutos: linha.minutos ?? 3,
        referencias: linha.referencias ?? [],
        premium: Boolean(linha.premium),
        publicado: true,
        capa: linha.capa ?? null,
        md: linha.corpo ?? '',
        cortado: Boolean(linha.cortado),
      };
    }
    return null;
  }

  try {
    const base = await json<ArtigoCompleto>(`/conteudo/artigos/${slug}.json`);
    const a = { ...base, ...(lerRascunho().artigos[slug] ?? {}) } as ArtigoCompleto;

    // ATENÇÃO: este corte é de VITRINE, não de segurança. Aqui o texto inteiro
    // já viajou até o navegador. É por isso que gerar-conteudo.mjs não publica
    // em /conteudo nenhum artigo marcado como Núcleo, e é por isso que, com o
    // banco ligado, quem corta é a função `ler_artigo` do servidor.
    if (a.premium) return { ...a, md: previa(a.md), cortado: true };
    return a;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ obras */

/**
 * Catálogo do Núcleo de Estudos.
 *
 * Só o livro é real hoje — está publicado na Hotmart e o link é o dele. Os
 * outros três nascem marcados como `exemplo: true` e aparecem no site com a
 * tarja "EM PREPARAÇÃO", porque anunciar produto que não existe é o jeito mais
 * rápido de queimar a credibilidade de um portal de doutrina. O Eleno troca
 * cada um pelo conteúdo real direto no painel.
 */
const OBRAS_BASE: Obra[] = [
  {
    slug: 'na-terra-dos-viventes',
    titulo: 'Na Terra dos Viventes',
    subtitulo: 'Espírito, Alma e Corpo · 1ª edição, 2026',
    descricao:
      'O livro em que Eleno Gutemberg destrincha a constituição tripartida do ser humano — o que é espírito, o que é alma, o que morre, o que permanece — e o que as Escrituras dizem sobre a terra dos viventes.',
    capa: '/marca/livro-capa.png',
    tipo: 'livro',
    precoCentavos: null,
    linkExterno: 'https://go.hotmart.com/I103629686U',
    exemplo: false,
    ativo: true,
    ordem: 0,
  },
  {
    slug: 'serie-escatologia',
    titulo: 'Escatologia sem Sensacionalismo',
    subtitulo: 'Série de estudos aprofundados',
    descricao:
      'As oito peças do eixo de Escatologia reunidas em ordem de leitura, com material de apoio, linha do tempo das dispensações e roteiro para estudo em grupo.',
    capa: null,
    tipo: 'serie',
    precoCentavos: null,
    linkExterno: null,
    exemplo: true,
    ativo: true,
    ordem: 1,
  },
  {
    slug: 'curso-hermeneutica',
    titulo: 'Ler a Bíblia por Inteiro',
    subtitulo: 'Curso de hermenêutica aplicada',
    descricao:
      'Método de leitura que o autor usa nos artigos: contexto histórico, gênero literário, léxico grego e hebraico, e a diferença entre o que o texto diz e o que se quer que ele diga.',
    capa: null,
    tipo: 'curso',
    precoCentavos: null,
    linkExterno: null,
    exemplo: true,
    ativo: true,
    ordem: 2,
  },
  {
    slug: 'circulo-do-pesquisador',
    titulo: 'Círculo do Pesquisador',
    subtitulo: 'Acesso mensal',
    descricao:
      'Estudos inéditos antes da publicação aberta, respostas às perguntas dos membros e encontro mensal ao vivo para discussão dos temas em pauta.',
    capa: null,
    tipo: 'plano',
    precoCentavos: null,
    linkExterno: null,
    exemplo: true,
    ativo: true,
    ordem: 3,
  },
];

export async function listarObras(): Promise<Obra[]> {
  if (temBanco) {
    const { data, error } = await supabase!.from('obras_publicas').select('*').order('ordem');
    if (!error && data?.length) {
      return (data as Record<string, unknown>[]).map((o) => ({
        slug: o.slug as string,
        titulo: o.titulo as string,
        subtitulo: (o.subtitulo as string) ?? '',
        descricao: (o.descricao as string) ?? '',
        capa: (o.capa as string) ?? null,
        tipo: (o.tipo as Obra['tipo']) ?? 'serie',
        precoCentavos: (o.preco_centavos as number) ?? null,
        linkExterno: (o.link_externo as string) ?? null,
        exemplo: Boolean(o.exemplo),
        ativo: Boolean(o.ativo),
        ordem: (o.ordem as number) ?? 0,
      }));
    }
  }
  const r = lerRascunho();
  return OBRAS_BASE.map((o) => ({ ...o, ...(r.obras[o.slug] ?? {}) }));
}

/* ------------------------------------------------------- envio de formulário */

export async function enviarMensagem(m: {
  nome: string;
  email: string;
  assunto: string;
  corpo: string;
}): Promise<{ ok: boolean; erro?: string }> {
  if (temBanco) {
    const { error } = await supabase!.from('mensagens').insert(m);
    return error ? { ok: false, erro: error.message } : { ok: true };
  }
  return { ok: false, erro: 'sem-banco' };
}

export async function inscrever(email: string, nome: string): Promise<{ ok: boolean; erro?: string }> {
  if (temBanco) {
    const { error } = await supabase!.from('inscritos').insert({ email, nome });
    return error ? { ok: false, erro: error.message } : { ok: true };
  }
  return { ok: false, erro: 'sem-banco' };
}
