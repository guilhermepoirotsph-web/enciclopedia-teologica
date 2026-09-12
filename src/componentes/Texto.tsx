import { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

/**
 * Corpo do artigo.
 *
 * Markdown -> HTML, higienizado antes de entrar na página. O conteúdo vem do
 * painel (ou seja, de um humano de confiança), mas "de confiança" não é modelo
 * de ameaça: uma conta de editor comprometida não pode virar XSS no site todo.
 *
 * Dois tratamentos editoriais em cima do markdown cru:
 *  - parágrafo que começa com referência bíblica seguida de travessão vira
 *    epígrafe (o Eleno escreve os versículos exatamente nesse formato);
 *  - todo título ganha âncora, para o índice lateral funcionar e para dar
 *    link direto a uma seção do estudo.
 */

const LIVROS =
  'G[êe]nesis|[ÊE]xodo|Lev[íi]tico|N[úu]meros|Deuteron[ôo]mio|Josu[ée]|Ju[íi]zes|Rute|Samuel|Reis|Cr[ôo]nicas|Esdras|Neemias|Ester|J[óo]|Salmos?|Prov[ée]rbios|Eclesiastes|Cantares|Isa[íi]as|Jeremias|Lamenta[çc][õo]es|Ezequiel|Daniel|Os[ée]ias|Joel|Am[óo]s|Obadias|Jonas|Miqu[ée]ias|Naum|Habacuque|Sofonias|Ageu|Zacarias|Malaquias|Mateus|Marcos|Lucas|Jo[ãa]o|Atos|Romanos|Cor[íi]ntios|G[áa]latas|Ef[ée]sios|Filipenses|Colossenses|Tessalonicenses|Tim[óo]teo|Tito|Filemom|Hebreus|Tiago|Pedro|Judas|Apocalipse';

const RE_EPIGRAFE = new RegExp(
  `^<p>((?:[1-3]|I{1,3})?\\s?(?:${LIVROS})[^<]{0,40}?)\\s*[—–-]\\s*(.+)</p>$`,
  'gim'
);

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

  return DOMPurify.sanitize(comAncora, { ADD_ATTR: ['id', 'target', 'rel'] });
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
  return <div className="leitura" dangerouslySetInnerHTML={{ __html: html }} />;
}
