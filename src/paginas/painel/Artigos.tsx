import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { painelArtigos, painelEixos, salvarArtigo } from '../../dados/painel';
import { dataCurta } from '../../componentes/CardArtigo';
import type { Artigo, Eixo } from '../../dados/tipos';

const chave = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Artigos() {
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [eixos, setEixos] = useState<Eixo[]>([]);
  const [busca, setBusca] = useState('');
  const [eixo, setEixo] = useState('');
  const [situacao, setSituacao] = useState<'todos' | 'aberto' | 'nucleo' | 'rascunho'>('todos');
  const [aviso, setAviso] = useState('');

  const recarregar = () => painelArtigos().then(setArtigos).catch(() => {});

  useEffect(() => {
    recarregar();
    painelEixos().then(setEixos).catch(() => {});
  }, []);

  const lista = useMemo(() => {
    let r = artigos;
    if (eixo) r = r.filter((a) => a.eixos.includes(eixo));
    if (situacao === 'aberto') r = r.filter((a) => a.publicado && !a.premium);
    if (situacao === 'nucleo') r = r.filter((a) => a.premium);
    if (situacao === 'rascunho') r = r.filter((a) => !a.publicado);
    if (busca.trim()) {
      const t = chave(busca);
      r = r.filter((a) => chave(a.titulo + ' ' + a.resumo).includes(t));
    }
    return r;
  }, [artigos, busca, eixo, situacao]);

  async function alternar(a: Artigo, campo: 'premium' | 'publicado') {
    const r = await salvarArtigo(a.slug, { [campo]: !a[campo] } as never);
    setAviso(
      r.ok
        ? r.previa
          ? 'Alterado no rascunho local (modo prévia).'
          : 'Alterado e salvo.'
        : `Não salvou: ${r.erro}`
    );
    recarregar();
    setTimeout(() => setAviso(''), 3500);
  }

  return (
    <>
      <header className="painel__cabeca">
        <div>
          <p className="rotulo">Acervo</p>
          <h1>Estudos</h1>
        </div>
        <Link to="/painel/novo" className="btn btn--ouro">
          Escrever novo
        </Link>
      </header>

      {aviso && <p className="recado recado--ok" style={{ marginBottom: '1.2rem' }}>{aviso}</p>}

      <div className="filtros">
        <label className="filtros__busca">
          <span className="desloca">Buscar</span>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar por título…" />
        </label>
        <label className="filtros__ordem">
          <span className="desloca">Eixo</span>
          <select value={eixo} onChange={(e) => setEixo(e.target.value)}>
            <option value="">Todos os eixos</option>
            {eixos.map((e) => (
              <option key={e.slug} value={e.nome}>
                {e.nome} ({e.total})
              </option>
            ))}
          </select>
        </label>
        <label className="filtros__ordem">
          <span className="desloca">Situação</span>
          <select value={situacao} onChange={(e) => setSituacao(e.target.value as never)}>
            <option value="todos">Todas as situações</option>
            <option value="aberto">Abertos</option>
            <option value="nucleo">Núcleo</option>
            <option value="rascunho">Rascunhos</option>
          </select>
        </label>
      </div>

      <p className="contagem">{lista.length} de {artigos.length} estudos</p>

      <div className="rolagem">
        <table className="tabela">
          <thead>
            <tr>
              <th style={{ width: '38%' }}>Estudo</th>
              <th>Eixos</th>
              <th>Tam.</th>
              <th>Revisado</th>
              <th>No ar</th>
              <th>Núcleo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.map((a) => (
              <tr key={a.slug}>
                <td>
                  <Link to={`/painel/artigo/${a.slug}`} style={{ color: 'var(--marfim)', fontWeight: 500 }}>
                    {a.icone && <span aria-hidden="true">{a.icone} </span>}
                    {a.titulo}
                  </Link>
                  <div className="fosco" style={{ fontSize: '0.76rem', marginTop: 2 }}>
                    /artigo/{a.slug}
                  </div>
                </td>
                <td className="fosco" style={{ fontSize: '0.8rem' }}>{a.eixos.join(' · ')}</td>
                <td className="mono fosco">{a.minutos} min</td>
                <td className="mono fosco" style={{ whiteSpace: 'nowrap' }}>{dataCurta(a.atualizado)}</td>
                <td>
                  <Chave ligado={a.publicado} aoTrocar={() => alternar(a, 'publicado')} rotulo={`Publicar ${a.titulo}`} />
                </td>
                <td>
                  <Chave ligado={a.premium} aoTrocar={() => alternar(a, 'premium')} rotulo={`Núcleo ${a.titulo}`} />
                </td>
                <td>
                  <Link to={`/artigo/${a.slug}`} target="_blank" className="fosco" style={{ fontSize: '0.78rem' }}>
                    ver ↗
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Chave({ ligado, aoTrocar, rotulo }: { ligado: boolean; aoTrocar: () => void; rotulo: string }) {
  return (
    <button
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      className={`chave ${ligado ? 'chave--ligada' : ''}`}
      onClick={aoTrocar}
    >
      <span />
    </button>
  );
}
