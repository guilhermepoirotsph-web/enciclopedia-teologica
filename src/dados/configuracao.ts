/**
 * Configuração do site.
 *
 * Tudo que é texto de marca, contato ou meio de pagamento mora aqui e, quando
 * o banco estiver ligado, passa a ser editável pelo painel (tabela `config`).
 *
 * ATENÇÃO às lacunas marcadas com string vazia: WhatsApp, e-mail, Instagram,
 * YouTube e chave Pix ainda NÃO foram informados. Enquanto estiverem vazios, o
 * site esconde o botão correspondente sozinho, em vez de mostrar um link morto
 * ou um número inventado. Não preencher com placeholder.
 */

export const SITE = {
  nome: 'Enciclopédia Teológica e Antropológica',
  nomeCurto: 'Enciclopédia Teológica',
  subtitulo: 'Estudos Bíblicos e Artigos Diversos',
  autor: 'Eleno Gutemberg',
  lema: 'Organizar o conhecimento para quem leva as Escrituras a sério.',

  /* ---- contatos (vazio = botão some) ---- */
  whatsapp: '', // só dígitos com DDI, ex.: 5512999999999
  email: '',
  instagram: '',
  youtube: '',
  cidade: '',

  /* ---- meios de receber ---- */
  // Link real do livro na Hotmart, conferido na página do Notion em 12/09/2026.
  hotmart: 'https://go.hotmart.com/I103629686U',
  pix: {
    chave: '',
    nome: '',
    cidade: '',
  },
  // InfiniteTag da InfinitePay, se ele quiser vender cartão sem gateway.
  infinitepay: '',
  // Valor sugerido de apoio, o mesmo que já existia no Notion.
  apoioSugerido: 10,

  /* ---- números do acervo: conferidos, não estimados ---- */
  // Estes três saem de public/conteudo/*.json em tempo de execução; ficam aqui
  // só como fallback se o fetch falhar. Números do site nunca são inflados.
  acervo: { artigos: 97, eixos: 32, palavras: 107031, desde: '2026-04-04' },
} as const;

export const temContato = (c: string) => Boolean(c && c.trim());

export function linkZap(texto: string) {
  if (!SITE.whatsapp) return null;
  return `https://wa.me/${SITE.whatsapp}?text=${encodeURIComponent(texto)}`;
}
