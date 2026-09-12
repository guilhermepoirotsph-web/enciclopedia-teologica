import type { Artigo, ArtigoCompleto, Eixo, Obra } from './tipos';

/**
 * Rascunho do MODO PRÉVIA.
 *
 * Enquanto o Supabase não existe, o painel precisa de algum lugar para guardar
 * o que o autor mexe — e o site precisa LER esse mesmo lugar, senão marcar um
 * estudo como "Núcleo" no painel não mudaria nada na página pública e a prévia
 * mentiria sobre o que o produto faz.
 *
 * Mora aqui, num módulo sem dependências, para o painel e a fonte pública
 * usarem o mesmo rascunho sem importarem um ao outro em círculo.
 *
 * Nada disso vale com banco ligado: aí a verdade é a tabela.
 */

export type Rascunho = {
  artigos: Record<string, Partial<ArtigoCompleto>>;
  obras: Record<string, Partial<Obra>>;
  eixos: Record<string, Partial<Eixo>>;
  config: Record<string, string>;
};

const CHAVE = 'eta.previa.rascunho';
const VAZIO: Rascunho = { artigos: {}, obras: {}, eixos: {}, config: {} };

export function lerRascunho(): Rascunho {
  try {
    const cru = localStorage.getItem(CHAVE);
    if (cru) return { ...VAZIO, ...JSON.parse(cru) };
  } catch {
    // localStorage bloqueado (janela anônima, política do navegador, captura de
    // miniatura): seguir sem rascunho é sempre melhor que derrubar a página.
  }
  return { ...VAZIO };
}

export function gravarRascunho(r: Rascunho) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(r));
  } catch {
    /* idem */
  }
}

export function limparRascunho() {
  try {
    localStorage.removeItem(CHAVE);
  } catch {
    /* idem */
  }
}

export function temRascunho() {
  const r = lerRascunho();
  return Object.keys(r.artigos).length + Object.keys(r.obras).length + Object.keys(r.config).length > 0;
}

/** Aplica o rascunho por cima de um artigo vindo do acervo publicado. */
export function comRascunho<T extends Artigo>(a: T, r = lerRascunho()): T {
  const p = r.artigos[a.slug];
  return p ? ({ ...a, ...p } as T) : a;
}
