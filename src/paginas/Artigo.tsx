import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Texto, { sumario } from '../componentes/Texto';
import CardArtigo, { dataCurta } from '../componentes/CardArtigo';
import { lerArtigo, listarArtigos } from '../dados/fonte';
import { useSessao } from '../dados/sessao';
import { SITE } from '../dados/configuracao';
import type { Artigo as TArtigo, ArtigoCompleto } from '../dados/tipos';

export default function Artigo() {
  const { slug = '' } = useParams();
  const { ehMembro } = useSessao();
  const [artigo, setArtigo] = useState<ArtigoCompleto | null>(null);
  const [todos, setTodos] = useState<TArtigo[]>([]);
  const [estado, setEstado] = useState<'carregando' | 'pronto' | 'perdido'>('carregando');
  const [progresso, setProgresso] = useState(0);

  useEffect(() => {
    setEstado('carregando');
    setArtigo(null);
    lerArtigo(slug)
      .then((a) => {
        setArtigo(a);
        setEstado(a ? 'pronto' : 'perdido');
      })
      .catch(() => setEstado('perdido'));
    listarArtigos().then(setTodos).catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!artigo) return;
    document.title = `${artigo.titulo} — ${SITE.nomeCurto}`;
    return () => {
      document.title = `${SITE.nome} — ${SITE.autor}`;
    };
  }, [artigo]);

  // Barra de progresso de leitura: num estudo de 14 minutos, saber quanto falta
  // é o que segura a pessoa até o fim.
  useEffect(() => {
    const aoRolar = () => {
      const h = document.documentElement;
      const total = h.scrollHeight - h.clientHeight;
      setProgresso(total > 0 ? Math.min(1, h.scrollTop / total) : 0);
    };
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, [artigo]);

  const indice = useMemo(() => (artigo ? sumario(artigo.md).slice(0, 14) : []), [artigo]);

  const relacionados = useMemo(() => {
    if (!artigo) return [];
    return todos
      .filter((a) => a.slug !== artigo.slug && a.eixos.some((e) => artigo.eixos.includes(e)))
      .slice(0, 3);
  }, [artigo, todos]);

  if (estado === 'carregando') {
    return (
      <div className="vazio" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
        <p className="rotulo">abrindo o estudo…</p>
      </div>
    );
  }

  if (estado === 'perdido' || !artigo) {
    return (
      <div className="cabeca">
        <div className="miolo">
          <p className="rotulo">Não encontrado</p>
          <h1>Esse estudo não está aqui</h1>
          <p className="olho">
            O endereço pode ter mudado. A biblioteca inteira continua aberta e a busca costuma achar
            pelo tema.
          </p>
          <p style={{ marginTop: '1.6rem' }}>
            <Link to="/biblioteca" className="btn btn--ouro">
              Ir para a biblioteca
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const bloqueado = artigo.premium && !ehMembro;

  return (
    <>
      <div className="progresso nao-imprime" aria-hidden="true">
        <span style={{ transform: `scaleX(${progresso})` }} />
      </div>

      <header className="cabeca">
        <div className="miolo">
          <p className="rotulo">
            {artigo.eixos.map((e, i) => (
              <span key={e}>
                {i > 0 && ' · '}
                {e}
              </span>
            ))}
          </p>
          <h1>
            {artigo.icone && <span aria-hidden="true">{artigo.icone} </span>}
            {artigo.titulo}
          </h1>
          <p className="artigo__meta">
            <span className="mono">{artigo.minutos} min de leitura</span>
            <span aria-hidden="true">·</span>
            <span className="mono">{artigo.palavras.toLocaleString('pt-BR')} palavras</span>
            <span aria-hidden="true">·</span>
            <span>Revisado em {dataCurta(artigo.atualizado)}</span>
            {artigo.premium ? (
              <span className="selo selo--premium">Núcleo</span>
            ) : (
              <span className="selo selo--aberto">Acesso aberto</span>
            )}
          </p>
        </div>
      </header>

      <div className="miolo artigo">
        <aside className="artigo__lado nao-imprime">
          {indice.length > 2 && (
            <nav className="indice" aria-label="Índice do estudo">
              <h2 className="rodape__titulo">Neste estudo</h2>
              {indice.map((t) => (
                <a key={t.id} href={`#${t.id}`} className={`indice__item indice__item--n${t.nivel}`}>
                  {t.texto}
                </a>
              ))}
            </nav>
          )}

          {artigo.referencias.length > 0 && (
            <div className="indice" style={{ marginTop: '2rem' }}>
              <h2 className="rodape__titulo">Referências citadas</h2>
              <div className="fitas fitas--mini">
                {artigo.referencias.map((r) => (
                  <Link key={r} to={`/biblioteca?q=${encodeURIComponent(r)}`} className="fita">
                    {r}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>

        <article className="artigo__corpo">
          <Texto md={artigo.md} />

          {bloqueado && (
            <div className="muro">
              <div className="muro__degrade" aria-hidden="true" />
              <div className="muro__caixa">
                <span className="selo selo--premium">Núcleo de Estudos</span>
                <h2>A continuação deste estudo é do Núcleo</h2>
                <p>
                  Os 97 artigos da biblioteca continuam abertos, sem login. Este aqui faz parte do
                  material aprofundado, com desenvolvimento completo, aparato de referências e
                  roteiro de estudo.
                </p>
                <div className="linha" style={{ justifyContent: 'center', marginTop: '1.4rem' }}>
                  <Link to="/nucleo" className="btn btn--ouro">
                    Entrar no Núcleo
                  </Link>
                  <Link to="/entrar" className="btn btn--linha">
                    Já sou membro
                  </Link>
                </div>
              </div>
            </div>
          )}

          <footer className="artigo__pe nao-imprime">
            <p className="artigo__direitos">
              <strong>{artigo.titulo}</strong> © {new Date(artigo.atualizado ?? Date.now()).getFullYear()}{' '}
              {SITE.autor}. Você pode citar e reproduzir este texto para estudo pessoal ou em sua
              igreja local, <strong>sempre indicando a fonte e o autor</strong>. Reprodução comercial
              ou republicação integral em outro site depende de autorização por escrito.
            </p>

            <div className="linha" style={{ marginTop: '1.4rem' }}>
              <button className="btn btn--linha" onClick={() => window.print()}>
                Imprimir / salvar em PDF
              </button>
              <button
                className="btn btn--linha"
                onClick={() => {
                  const url = location.href;
                  if (navigator.share) navigator.share({ title: artigo.titulo, url }).catch(() => {});
                  else navigator.clipboard?.writeText(url);
                }}
              >
                Compartilhar
              </button>
            </div>
          </footer>
        </article>
      </div>

      {relacionados.length > 0 && (
        <section className="secao secao--pedra nao-imprime">
          <div className="miolo">
            <div className="filete">
              <span className="rotulo">No mesmo eixo</span>
            </div>
            <div className="grade grade--3" style={{ marginTop: '1.6rem' }}>
              {relacionados.map((a) => (
                <CardArtigo key={a.slug} a={a} />
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
