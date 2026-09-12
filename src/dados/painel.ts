import { supabase, temBanco } from './supabase';
import { listarArtigos, lerArtigo, listarEixos, listarObras } from './fonte';
import type { Artigo, ArtigoCompleto, Eixo, Obra } from './tipos';
import { gravarRascunho, lerRascunho } from './rascunho';
export { limparRascunho, temRascunho } from './rascunho';

/**
 * Operações do painel.
 *
 * Com banco: escreve no Supabase. A RLS é que decide se a escrita passa — este
 * arquivo não é a trava de segurança, é só a interface. Esconder um botão nunca
 * protegeu tabela nenhuma.
 *
 * Sem banco: MODO PRÉVIA. As alterações ficam num rascunho no localStorage do
 * próprio navegador, para o autor percorrer o painel inteiro e aprovar o fluxo.
 * A tela avisa isso o tempo todo — automação que "roda com sucesso" sem fazer
 * nada é o pior defeito possível.
 */

/* ------------------------------------------------------------- leitura */

export async function painelArtigos(): Promise<Artigo[]> {
  if (temBanco) {
    const { data, error } = await supabase!
      .from('artigos')
      .select('slug,titulo,icone,eixos,resumo,criado_em,atualizado_em,palavras,minutos,premium,publicado,capa')
      .order('atualizado_em', { ascending: false });
    if (error) throw error;
    return (data as Record<string, unknown>[]).map(mapear);
  }

  const base = await listarArtigos();
  const r = lerRascunho();
  return base.map((a) => ({ ...a, ...(r.artigos[a.slug] ?? {}) })) as Artigo[];
}

export async function painelArtigo(slug: string): Promise<ArtigoCompleto | null> {
  if (temBanco) {
    const { data, error } = await supabase!.from('artigos').select('*').eq('slug', slug).maybeSingle();
    if (error || !data) return null;
    return { ...mapear(data as Record<string, unknown>), md: (data as Record<string, unknown>).corpo as string } as ArtigoCompleto;
  }

  const base = await lerArtigo(slug);
  if (!base) return null;
  const r = lerRascunho();
  return { ...base, ...(r.artigos[slug] ?? {}) } as ArtigoCompleto;
}

export async function painelEixos(): Promise<Eixo[]> {
  const base = await listarEixos();
  if (temBanco) return base;
  const r = lerRascunho();
  return base.map((e) => ({ ...e, ...(r.eixos[e.slug] ?? {}) }));
}

export async function painelObras(): Promise<Obra[]> {
  const base = await listarObras();
  if (temBanco) return base;
  const r = lerRascunho();
  return base.map((o) => ({ ...o, ...(r.obras[o.slug] ?? {}) }));
}

/* ------------------------------------------------------------- escrita */

export type Resultado = { ok: boolean; previa: boolean; erro?: string };

export async function salvarArtigo(slug: string, campos: Partial<ArtigoCompleto>): Promise<Resultado> {
  const palavras = campos.md ? campos.md.split(/\s+/).filter(Boolean).length : undefined;
  const minutos = palavras ? Math.max(2, Math.round(palavras / 200)) : undefined;

  if (temBanco) {
    const linha: Record<string, unknown> = {
      atualizado_em: new Date().toISOString(),
    };
    if (campos.titulo !== undefined) linha.titulo = campos.titulo;
    if (campos.icone !== undefined) linha.icone = campos.icone;
    if (campos.resumo !== undefined) linha.resumo = campos.resumo;
    if (campos.eixos !== undefined) linha.eixos = campos.eixos;
    if (campos.md !== undefined) linha.corpo = campos.md;
    if (campos.premium !== undefined) linha.premium = campos.premium;
    if (campos.publicado !== undefined) linha.publicado = campos.publicado;
    if (campos.capa !== undefined) linha.capa = campos.capa;
    if (palavras !== undefined) {
      linha.palavras = palavras;
      linha.minutos = minutos;
    }

    const { error } = await supabase!.from('artigos').update(linha).eq('slug', slug);
    return error ? { ok: false, previa: false, erro: error.message } : { ok: true, previa: false };
  }

  const r = lerRascunho();
  r.artigos[slug] = {
    ...(r.artigos[slug] ?? {}),
    ...campos,
    ...(palavras !== undefined ? { palavras, minutos } : {}),
    atualizado: new Date().toISOString(),
  };
  gravarRascunho(r);
  return { ok: true, previa: true };
}

export async function criarArtigo(a: {
  slug: string;
  titulo: string;
  eixos: string[];
  resumo: string;
  md: string;
  premium: boolean;
  publicado: boolean;
}): Promise<Resultado> {
  const palavras = a.md.split(/\s+/).filter(Boolean).length;

  if (temBanco) {
    const { error } = await supabase!.from('artigos').insert({
      slug: a.slug,
      titulo: a.titulo,
      icone: '',
      eixos: a.eixos,
      resumo: a.resumo,
      corpo: a.md,
      referencias: [],
      palavras,
      minutos: Math.max(2, Math.round(palavras / 200)),
      premium: a.premium,
      publicado: a.publicado,
    });
    return error ? { ok: false, previa: false, erro: error.message } : { ok: true, previa: false };
  }

  const r = lerRascunho();
  r.artigos[a.slug] = {
    ...a,
    icone: '',
    referencias: [],
    palavras,
    minutos: Math.max(2, Math.round(palavras / 200)),
    criado: new Date().toISOString(),
    atualizado: new Date().toISOString(),
  };
  gravarRascunho(r);
  return { ok: true, previa: true };
}

export async function salvarObra(slug: string, campos: Partial<Obra>): Promise<Resultado> {
  if (temBanco) {
    const linha: Record<string, unknown> = {};
    if (campos.titulo !== undefined) linha.titulo = campos.titulo;
    if (campos.subtitulo !== undefined) linha.subtitulo = campos.subtitulo;
    if (campos.descricao !== undefined) linha.descricao = campos.descricao;
    if (campos.linkExterno !== undefined) linha.link_externo = campos.linkExterno;
    if (campos.precoCentavos !== undefined) linha.preco_centavos = campos.precoCentavos;
    if (campos.exemplo !== undefined) linha.exemplo = campos.exemplo;
    if (campos.ativo !== undefined) linha.ativo = campos.ativo;
    const { error } = await supabase!.from('obras').update(linha).eq('slug', slug);
    return error ? { ok: false, previa: false, erro: error.message } : { ok: true, previa: false };
  }

  const r = lerRascunho();
  r.obras[slug] = { ...(r.obras[slug] ?? {}), ...campos };
  gravarRascunho(r);
  return { ok: true, previa: true };
}

export async function salvarConfig(chave: string, valor: string): Promise<Resultado> {
  if (temBanco) {
    const { error } = await supabase!.from('config').upsert({ chave, valor }, { onConflict: 'chave' });
    return error ? { ok: false, previa: false, erro: error.message } : { ok: true, previa: false };
  }
  const r = lerRascunho();
  r.config[chave] = valor;
  gravarRascunho(r);
  return { ok: true, previa: true };
}

export function lerConfigLocal(): Record<string, string> {
  return lerRascunho().config;
}

/* ------------------------------------------------------- caixa de entrada */

export type Mensagem = { id: string; nome: string; email: string; assunto: string; corpo: string; lido: boolean; criado_em: string };

export async function painelMensagens(): Promise<Mensagem[]> {
  if (!temBanco) return [];
  const { data, error } = await supabase!.from('mensagens').select('*').order('criado_em', { ascending: false }).limit(200);
  if (error) throw error;
  return data as Mensagem[];
}

export type Membro = { id: string; nome: string; email: string; papel: string; ativo: boolean; membro_ate: string | null; criado_em: string };

export async function painelMembros(): Promise<Membro[]> {
  if (!temBanco) return [];
  const { data, error } = await supabase!.from('perfis').select('*').order('criado_em', { ascending: false }).limit(500);
  if (error) throw error;
  return data as Membro[];
}

/* ------------------------------------------------------------ utilidades */

function mapear(a: Record<string, unknown>): Artigo {
  return {
    slug: a.slug as string,
    titulo: a.titulo as string,
    icone: (a.icone as string) ?? '',
    eixos: (a.eixos as string[]) ?? [],
    resumo: (a.resumo as string) ?? '',
    criado: (a.criado_em as string) ?? null,
    atualizado: (a.atualizado_em as string) ?? null,
    palavras: (a.palavras as number) ?? 0,
    minutos: (a.minutos as number) ?? 3,
    referencias: (a.referencias as string[]) ?? [],
    premium: Boolean(a.premium),
    publicado: a.publicado === undefined ? true : Boolean(a.publicado),
    capa: (a.capa as string) ?? null,
  };
}

export function slugificar(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 70);
}
