import { useEffect, useMemo, useState, type RefObject } from 'react';
import { listarArtigos } from '../../dados/fonte';
import type { Artigo } from '../../dados/tipos';

/**
 * Barra de formatação do editor.
 *
 * O Eleno escreve em markdown, mas não deveria precisar decorar markdown. Cada
 * botão envolve a seleção (ou insere um modelo) e devolve o cursor no lugar
 * certo — inclusive o de link, que é o motivo desta barra existir.
 *
 * O botão mais importante é o "Ligar a outro estudo": ele abre a lista dos 97
 * artigos com busca, e o autor escolhe pelo TÍTULO. Ninguém precisa saber que
 * existe um endereço `/artigo/josias-rei-de-juda` por baixo — e assim o link
 * nunca sai errado.
 */

type Props = {
  area: RefObject<HTMLTextAreaElement>;
  valor: string;
  aoMudar: (novo: string) => void;
  /** slug do artigo que está sendo editado, para ele não linkar em si mesmo */
  slugAtual?: string;
};

const chave = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function BarraTexto({ area, valor, aoMudar, slugAtual }: Props) {
  const [escolhendo, setEscolhendo] = useState(false);

  /** Insere texto no cursor, mantendo o que estava selecionado no meio. */
  function envolver(antes: string, depois = '', modelo = '') {
    const el = area.current;
    if (!el) return;
    const ini = el.selectionStart;
    const fim = el.selectionEnd;
    const selecionado = valor.slice(ini, fim) || modelo;
    const novo = valor.slice(0, ini) + antes + selecionado + depois + valor.slice(fim);
    aoMudar(novo);

    // devolve o cursor para dentro do que foi inserido, no próximo quadro
    requestAnimationFrame(() => {
      el.focus();
      const a = ini + antes.length;
      el.setSelectionRange(a, a + selecionado.length);
    });
  }

  /** Comandos de linha inteira (título, lista, citação). */
  function noInicioDaLinha(prefixo: string) {
    const el = area.current;
    if (!el) return;
    const ini = el.selectionStart;
    const inicioLinha = valor.lastIndexOf('\n', ini - 1) + 1;
    const novo = valor.slice(0, inicioLinha) + prefixo + valor.slice(inicioLinha);
    aoMudar(novo);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(ini + prefixo.length, ini + prefixo.length);
    });
  }

  function linkExterno() {
    const url = window.prompt('Endereço do link (comece com https://)');
    if (!url) return;
    const limpo = url.trim();
    if (!/^https?:\/\//i.test(limpo)) {
      alert('O endereço precisa começar com https:// — senão o link não abre.');
      return;
    }
    envolver('[', `](${limpo})`, 'texto do link');
  }

  function inserirEstudo(a: Artigo) {
    envolver('[', `](/artigo/${a.slug})`, a.titulo);
    setEscolhendo(false);
  }

  return (
    <>
      <div className="barra-texto">
        <button type="button" onClick={() => noInicioDaLinha('## ')} title="Título de seção">
          Seção
        </button>
        <button type="button" onClick={() => noInicioDaLinha('### ')} title="Subtítulo">
          Subtítulo
        </button>
        <span className="barra-texto__sep" />
        <button type="button" onClick={() => envolver('**', '**', 'negrito')}>
          <strong>N</strong>
        </button>
        <button type="button" onClick={() => envolver('*', '*', 'itálico')}>
          <em>I</em>
        </button>
        <span className="barra-texto__sep" />
        <button type="button" onClick={() => noInicioDaLinha('- ')} title="Lista">
          Lista
        </button>
        <button type="button" onClick={() => noInicioDaLinha('> ')} title="Citação destacada">
          Citação
        </button>
        <span className="barra-texto__sep" />
        <button type="button" onClick={linkExterno} title="Link para fora do site">
          🔗 Link
        </button>
        <button type="button" onClick={() => setEscolhendo(true)} title="Link para outro estudo daqui">
          ✦ Ligar a outro estudo
        </button>
      </div>

      <EscolherEstudo
        aberto={escolhendo}
        slugAtual={slugAtual}
        aoFechar={() => setEscolhendo(false)}
        aoEscolher={inserirEstudo}
      />
    </>
  );
}

/* --------------------------------------------------- seletor de estudos */

function EscolherEstudo({
  aberto,
  slugAtual,
  aoFechar,
  aoEscolher,
}: {
  aberto: boolean;
  slugAtual?: string;
  aoFechar: () => void;
  aoEscolher: (a: Artigo) => void;
}) {
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [busca, setBusca] = useState('');

  useEffect(() => {
    if (aberto && !artigos.length) listarArtigos().then(setArtigos).catch(() => {});
  }, [aberto, artigos.length]);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e: KeyboardEvent) => e.key === 'Escape' && aoFechar();
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [aberto, aoFechar]);

  const lista = useMemo(() => {
    const semEle = artigos.filter((a) => a.slug !== slugAtual);
    if (!busca.trim()) return semEle.slice(0, 60);
    const t = chave(busca);
    return semEle.filter((a) => chave(a.titulo + ' ' + a.eixos.join(' ')).includes(t)).slice(0, 60);
  }, [artigos, busca, slugAtual]);

  return (
    <div className={`escolher ${aberto ? 'escolher--aberto' : ''}`} hidden={!aberto}>
      <div className="escolher__caixa">
        <div className="linha" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1.4rem' }}>Ligar a outro estudo</h2>
          <button className="btn btn--linha" onClick={aoFechar}>
            Fechar
          </button>
        </div>

        <p className="fosco" style={{ fontSize: '0.86rem', margin: '0.6rem 0 0' }}>
          Escolha pelo título. O endereço é montado sozinho, então o link nunca sai errado.
        </p>

        <label className="campo" style={{ marginTop: '1rem', marginBottom: 0 }}>
          <span>Buscar</span>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Digite parte do título…" autoFocus />
        </label>

        <div className="escolher__lista">
          {lista.map((a) => (
            <button key={a.slug} className="escolher__item" onClick={() => aoEscolher(a)}>
              {a.titulo}
              <small>{a.eixos.join(' · ')}</small>
            </button>
          ))}
          {!lista.length && (
            <p className="fosco" style={{ padding: '1rem' }}>
              {artigos.length ? 'Nenhum estudo com esse termo.' : 'Carregando os estudos…'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
