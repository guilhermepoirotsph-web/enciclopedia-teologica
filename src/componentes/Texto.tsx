import { useMemo, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * Corpo do artigo.
 *
 * Markdown -> HTML, higienizado antes de entrar na página. O conteúdo vem do
 * painel (ou seja, de um humano de confiança), mas "de confiança" não é modelo
 * de ameaça: uma conta de editor comprometida não pode virar XSS no site todo.
 *
 * Tratamentos editoriais em cima do markdown cru:
 *  - parágrafo que começa com referência bíblica seguida de travessão vira
 *    epígrafe (o Eleno escreve os versículos exatamente nesse formato);
 *  - todo título ganha âncora, para o índice lateral funcionar e para dar
 *    link direto a uma seção do estudo;
 *  - LINKS: externo abre em aba nova e protegido; link para outro estudo da
 *    própria enciclopédia navega sem recarregar a página; link morto vira
 *    texto comum.
 */

const LIVROS =
  'G[êe]nesis|[ÊE]xodo|Lev[íi]tico|N[úu]meros|Deuteron[ôo]mio|Josu[ée]|Ju[íi]zes|Rute|Samuel|Reis|Cr[ôo]nicas|Esdras|Neemias|Ester|J[óo]|Salmos?|Prov[ée]rbios|Eclesiastes|Cantares|Isa[íi]as|Jeremias|Lamenta[çc][õo]es|Ezequiel|Daniel|Os[ée]ias|Joel|Am[óo]s|Obadias|Jonas|Miqu[ée]ias|Naum|Habacuque|Sofonias|Ageu|Zacarias|Malaquias|Mateus|Marcos|Lucas|Jo[ãa]o|Atos|Romanos|Cor[íi]ntios|G[áa]latas|Ef[ée]sios|Filipenses|Colossenses|Tessalonicenses|Tim[óo]teo|Tito|Filemom|Hebreus|Tiago|Pedro|Judas|Apocalipse';

const RE_EPIGRAFE = new RegExp(
  `^<p>((?:[1-3]|I{1,3})?\\s?(?:${LIVROS})[^<]{0,40}?)\\s*[—–-]\\s*(.+)</p>$`,
  'gim'
);

/** Endereços internos do próprio site. */
const RE_INTERNO = /^\/(artigo|eixo|biblioteca|eixos|nucleo|livro|autor|apoie|contato|direitos|privacidade|esclarecimento)(\/|$|#|\?)/;

/** Esquemas que o navegador abre de verdade. O resto é link morto. */
const ESQUEMA_VIVO = /^(https?:|mailto:|tel:|#|\/)/i;

export function paraHtml(md: string): string {
  const bruto = marked.parse(md, { async: false, breaks: false, gfm: true }) as string;

  const comEpigrafe = bruto.replace(
    RE_EPIGRAFE,
    (_t, ref: string, texto: string) =>
      `<blockquote class="versiculo"><strong>${ref.trim()}</strong><br/>${texto.trim()}</blockquote>`
  );

  const comAncora = comEpigrafe.replace(
    /<(h[234])>(.*?)<\/\1>/g,
    (_t, tag: string, conteudo: string) => `<${tag} id="${ancora(conteudo)}">${conteudo}</${tag}>`
  );

  const comLinks = tratarLinks(comAncora);
  const semImagemMorta = tratarImagens(comLinks);

  return DOMPurify.sanitize(semImagemMorta, { ADD_ATTR: ['id', 'target', 'rel'] });
}

/**
 * Decide o destino de cada link.
 *
 * Link externo sem `rel` é um problema real: a página de destino ganha acesso
 * ao `window.opener` do site. Por isso todo externo sai com
 * `noopener noreferrer`, e com `target="_blank"` para o leitor não perder o
 * estudo que estava lendo.
 */
function tratarLinks(html: string) {
  // Casa a âncora INTEIRA, com o texto e o fechamento. Trocar só a tag de
  // abertura deixaria um `</a>` órfão quando o link morto vira texto — HTML
  // quebrado que o higienizador conserta de um jeito imprevisível.
  return html.replace(/<a\s+href="([^"]*)"([^>]*)>([\s\S]*?)<\/a>/gi, (_tudo, href: string, resto: string, texto: string) => {
    const destino = href.trim();

    // Link morto (o `attachment:` do Notion é o caso típico): vira texto comum.
    // Melhor não ter link do que ter um que não leva a lugar nenhum.
    if (!ESQUEMA_VIVO.test(destino)) return texto;

    if (RE_INTERNO.test(destino)) {
      return `<a href="${destino}" class="link-interno" data-interno="1"${resto}>${texto}</a>`;
    }
    if (/^(mailto:|tel:|#)/i.test(destino)) {
      return `<a href="${destino}"${resto}>${texto}</a>`;
    }
    return `<a href="${destino}" class="link-externo" target="_blank" rel="noopener noreferrer"${resto}>${texto}</a>`;
  });
}

/** Imagem cujo endereço não é servível some — placeholder quebrado é pior. */
function tratarImagens(html: string) {
  return html.replace(/<img\s+[^>]*src="([^"]*)"[^>]*>/gi, (tag, src: string) =>
    ESQUEMA_VIVO.test(src.trim()) ? tag.replace('<img ', '<img loading="lazy" ') : ''
  );
}

export function ancora(s: string) {
  return s
    .replace(/<[^>]+>/g, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .slice(0, 60);
}

/** Títulos de nível 2 e 3, para o índice lateral do estudo. */
export function sumario(md: string) {
  return md
    .split('\n')
    .map((l) => l.match(/^(#{2,3})\s+(.+)$/))
    .filter(Boolean)
    .map((m) => ({ nivel: m![1].length, texto: m![2].replace(/[*_`]/g, '').trim() }))
    .map((t) => ({ ...t, id: ancora(t.texto) }));
}

export default function Texto({ md }: { md: string }) {
  const html = useMemo(() => paraHtml(md), [md]);
  const navegar = useNavigate();

  /**
   * Link para outro estudo navega sem recarregar.
   *
   * O HTML do artigo é inserido direto no DOM, então esses links não passam
   * pelo <Link> do roteador. Sem esta interceptação, clicar em "veja o estudo
   * sobre a Fé" recarregaria o site inteiro — e no GitHub Pages em subpasta
   * ainda cairia fora da base.
   */
  function aoClicar(e: MouseEvent<HTMLDivElement>) {
    const alvo = (e.target as HTMLElement).closest('a[data-interno]') as HTMLAnchorElement | null;
    if (!alvo) return;
    // Ctrl/Cmd/meio: o leitor quer abrir em outra aba. Não atrapalhar.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    navegar(alvo.getAttribute('href')!);
  }

  return <div className="leitura" onClick={aoClicar} dangerouslySetInnerHTML={{ __html: html }} />;
}
