/**
 * Configuração do site.
 *
 * `SITE` é um objeto MUTÁVEL de propósito: ele nasce com os padrões abaixo e é
 * sobrescrito por `carregarConfig()` antes de a aplicação renderizar. Assim as
 * páginas continuam fazendo `import { SITE }` e leem sempre o valor vivo, sem
 * precisar de contexto nem de re-render.
 *
 * Por que isso existe: antes, o painel gravava a configuração no banco e NADA
 * no site lia. O Eleno podia digitar o WhatsApp dele, ver "salvo" na tela, e o
 * botão continuar escondido para sempre. É o defeito mais repetido do kit —
 * configuração pela metade parece pronta e não muda nada.
 *
 * ATENÇÃO às lacunas em branco: WhatsApp, e-mail, redes e chave Pix ainda não
 * foram informados. Enquanto estiverem vazios o site ESCONDE o botão
 * correspondente, em vez de mostrar link morto ou número inventado.
 */

export type Estacao = 'nenhuma' | 'nave' | 'vitral' | 'salmo' | 'externa';

export type Config = {
  nome: string;
  nomeCurto: string;
  subtitulo: string;
  autor: string;
  lema: string;

  whatsapp: string;
  email: string;
  instagram: string;
  youtube: string;
  cidade: string;

  hotmart: string;
  pix: { chave: string; nome: string; cidade: string };
  infinitepay: string;
  apoioSugerido: number;

  /** Trilha sonora ambiente — "a rádio" da enciclopédia. */
  radio: {
    /** estação escolhida pelo autor no painel */
    estacao: Estacao;
    /** o visitante vê o botão de som? */
    mostrar: boolean;
    /** volume inicial, 0 a 1 */
    volume: number;
    /** usado só quando estacao === 'externa': URL de um mp3 ou stream */
    url: string;
  };

  acervo: { artigos: number; eixos: number; palavras: number; desde: string };
};

const PADRAO: Config = {
  nome: 'Enciclopédia Teológica e Antropológica',
  nomeCurto: 'Enciclopédia Teológica',
  subtitulo: 'Estudos Bíblicos e Artigos Diversos',
  autor: 'Eleno Gutemberg',
  lema: 'Organizar o conhecimento para quem leva as Escrituras a sério.',

  whatsapp: '',
  email: '',
  instagram: '',
  youtube: '',
  cidade: '',

  // Link real do livro na Hotmart, conferido na página do Notion em 12/09/2026.
  hotmart: 'https://go.hotmart.com/I103629686U',
  pix: { chave: '', nome: '', cidade: '' },
  infinitepay: '',
  apoioSugerido: 10,

  radio: { estacao: 'nave', mostrar: true, volume: 0.35, url: '' },

  // Números conferidos, nunca estimados. Servem de reserva se o fetch falhar.
  acervo: { artigos: 97, eixos: 32, palavras: 107031, desde: '2026-04-04' },
};

export const SITE: Config = { ...PADRAO, pix: { ...PADRAO.pix }, radio: { ...PADRAO.radio }, acervo: { ...PADRAO.acervo } };

/* ------------------------------------------------------------- aplicação */

const CACHE = 'eta.config';

/** Converte as linhas chave/valor do banco no formato do objeto SITE. */
function aplicar(linhas: Record<string, string>) {
  const t = (k: string) => (linhas[k] ?? '').trim();

  if (t('whatsapp')) SITE.whatsapp = t('whatsapp').replace(/\D/g, '');
  if (t('email')) SITE.email = t('email');
  if (t('instagram')) SITE.instagram = t('instagram');
  if (t('youtube')) SITE.youtube = t('youtube');
  if (t('cidade')) SITE.cidade = t('cidade');
  if (t('hotmart')) SITE.hotmart = t('hotmart');
  if (t('infinitepay')) SITE.infinitepay = t('infinitepay');

  if (t('pix_chave')) SITE.pix.chave = t('pix_chave');
  if (t('pix_nome')) SITE.pix.nome = t('pix_nome');
  if (t('pix_cidade')) SITE.pix.cidade = t('pix_cidade');

  const est = t('radio_estacao');
  if (est) SITE.radio.estacao = est as Estacao;
  if (linhas.radio_mostrar !== undefined) SITE.radio.mostrar = t('radio_mostrar') !== 'nao';
  const vol = Number(t('radio_volume'));
  if (Number.isFinite(vol) && vol >= 0 && vol <= 1) SITE.radio.volume = vol;
  if (t('radio_url')) SITE.radio.url = t('radio_url');
}

/**
 * Carrega a configuração antes de a aplicação montar.
 *
 * Duas camadas, de propósito:
 *  1. o cache no navegador entra na hora, então quem já visitou não espera nada;
 *  2. a rede atualiza o cache, com TETO DE TEMPO — se o banco demorar, o site
 *     sobe assim mesmo. Nenhuma página fica esperando configuração para existir.
 */
export async function carregarConfig(buscar: () => Promise<Record<string, string>>) {
  try {
    const cru = localStorage.getItem(CACHE);
    if (cru) aplicar(JSON.parse(cru));
  } catch {
    /* localStorage bloqueado: segue com os padrões */
  }

  try {
    const linhas = await Promise.race([
      buscar(),
      new Promise<Record<string, string>>((_, rej) => setTimeout(() => rej(new Error('teto')), 1200)),
    ]);
    if (linhas && Object.keys(linhas).length) {
      aplicar(linhas);
      try {
        localStorage.setItem(CACHE, JSON.stringify(linhas));
      } catch {
        /* idem */
      }
    }
  } catch {
    /* sem rede, banco desligado ou demorou demais: os padrões bastam */
  }
}

/* ------------------------------------------------------------ utilidades */

export const temContato = (c: string) => Boolean(c && c.trim());

export function linkZap(texto: string) {
  if (!SITE.whatsapp) return null;
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(texto)}`;
}
