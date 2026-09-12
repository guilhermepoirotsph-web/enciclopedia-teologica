import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Aparece from '../componentes/Aparece';
import CardArtigo from '../componentes/CardArtigo';
import { listarArtigos, listarEixos } from '../dados/fonte';
import type { Artigo, Eixo } from '../dados/tipos';

type Ordem = 'recentes' | 'antigos' | 'longos' | 'az';

/** Busca sem acento e sem caixa — "genesis" acha "Gênesis". */
const chave = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Biblioteca() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [eixos, setEixos] = useState<Eixo[]>([]);
  const [carregando, setCarregando] = useState(true);

  const busca = params.get('q') ?? '';
  const ordem = (params.get('ordem') as Ordem) ?? 'recentes';

  useEffect(() => {
    Promise.all([listarArtigos(), listarEixos()])
      .then(([a, e]) => {
        setArtigos(a);
        setEixos(e);
      })
      .finally(() => setCarregando(false));
  }, []);

  const eixoAtual = useMemo(() => eixos.find((e) => e.slug === slug) ?? null, [eixos, slug]);

  const lista = useMemo(() => {
    let r = artigos;

    if (eixoAtual) r = r.filter((a) => a.eixos.includes(eixoAtual.nome));

    if (busca.trim()) {
      const termos = chave(busca).split(/\s+/).filter(Boolean);
      r = r.filter((a) => {
        const alvo = chave([a.titulo, a.resumo, a.eixos.join(' '), a.referencias.join(' ')].join(' '));
        return termos.every((t) => alvo.includes(t));
      });
    }

    const c = [...r];
    if (ordem === 'recentes') c.sort((a, b) => (b.atualizado ?? '').localeCompare(a.atualizado ?? ''));
    if (ordem === 'antigos') c.sort((a, b) => (a.criado ?? '').localeCompare(b.criado ?? ''));
    if (ordem === 'longos') c.sort((a, b) => b.palavras - a.palavras);
    if (ordem === 'az') c.sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
    return c;
  }, [artigos, eixoAtual, busca, ordem]);

  const mexer = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  };

  return (
    <>
      <header className="cabeca">
        <div className="miolo">
          <p className="rotulo">{eixoAtual ? 'Eixo temático' : 'Acervo aberto'}</p>
          <h1>{eixoAtual ? eixoAtual.nome : 'Biblioteca'}</h1>
          <p className="olho">
            {eixoAtual
              ? eixoAtual.descricao
              : 'Todo o acervo, aberto e sem login. Busque por tema, por livro da Bíblia ou por trecho do título — a busca ignora acento.'}
          </p>
          {eixoAtual && (
            <p style={{ marginTop: '1.2rem' }}>
              <Link to="/biblioteca" className="esclarecimento__link">
                ← Ver o acervo inteiro
              </Link>
            </p>
          )}
        </div>
      </header>

      <section className="secao" style={{ paddingTop: '2.6rem' }}>
        <div className="miolo">
          <div className="filtros">
            <label className="filtros__busca">
              <span className="desloca">Buscar no acervo</span>
              <input
                type="search"
                value={busca}
                placeholder="Buscar por tema, título ou referência bíblica…"
                onChange={(e) => mexer('q', e.target.value)}
              />
            </label>

            <label className="filtros__ordem">
              <span className="desloca">Ordenar</span>
              <select value={ordem} onChange={(e) => mexer('ordem', e.target.value)}>
                <option value="recentes">Revisados por último</option>
                <option value="antigos">Mais antigos primeiro</option>
                <option value="longos">Mais longos primeiro</option>
                <option value="az">Ordem alfabética</option>
              </select>
            </label>
          </div>

          {!eixoAtual && eixos.length > 0 && (
            <div className="fitas">
              {eixos.map((e) => (
                <Link key={e.slug} to={`/eixo/${e.slug}`} className="fita">
                  {e.nome}
                  <span className="mono">{e.total}</span>
                </Link>
              ))}
            </div>
          )}

          <p className="contagem">
            {carregando ? 'Carregando o acervo…' : `${lista.length} ${lista.length === 1 ? 'estudo' : 'estudos'}`}
            {busca && !carregando && <> para “{busca}”</>}
          </p>

          {!carregando && lista.length === 0 && (
            <div className="vazio">
              <p>Nenhum estudo bate com essa busca.</p>
              <button className="btn btn--linha" onClick={() => mexer('q', '')} style={{ marginTop: '1rem' }}>
                Limpar a busca
              </button>
            </div>
          )}

          <div className="grade grade--3" style={{ marginTop: '1.8rem' }}>
            {lista.map((a, i) => (
              <Aparece key={a.slug} atraso={Math.min(i, 8) * 45}>
                <CardArtigo a={a} />
              </Aparece>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
