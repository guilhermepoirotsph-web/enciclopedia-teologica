import { NavLink, Navigate, Route, Routes, Link } from 'react-router-dom';
import Selo from '../../marca/Selo';
import { useSessao } from '../../dados/sessao';
import { limparRascunho, temRascunho } from '../../dados/painel';
import Resumo from './Resumo';
import Artigos from './Artigos';
import Editor from './Editor';
import NucleoAdmin from './NucleoAdmin';
import Caixa from './Caixa';
import Config from './Config';
import Importar from './Importar';
import Ajuda from './Ajuda';

const MENU = [
  { para: '/painel', fim: true, nome: 'Resumo', icone: '◈' },
  { para: '/painel/artigos', nome: 'Estudos', icone: '✎' },
  { para: '/painel/novo', nome: 'Escrever novo', icone: '＋' },
  { para: '/painel/importar', nome: 'Importar do Notion', icone: '⇣' },
  { para: '/painel/nucleo', nome: 'Núcleo', icone: '✦' },
  { para: '/painel/caixa', nome: 'Mensagens e membros', icone: '✉' },
  { para: '/painel/config', nome: 'Configurações', icone: '⚙' },
  { para: '/painel/ajuda', nome: 'Como usar', icone: '?' },
];

export default function Painel() {
  const { perfil, modoPrevia, sair } = useSessao();

  return (
    <div className="painel">
      <aside className="painel__lado">
        <div className="painel__marca">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Selo tamanho={32} variante="compacto" />
            <span style={{ fontFamily: 'var(--serifa)', fontSize: '1rem', color: 'var(--marfim)' }}>
              Painel do autor
            </span>
          </Link>
        </div>

        <nav className="painel__nav">
          {MENU.map((m) => (
            <NavLink
              key={m.para}
              to={m.para}
              end={m.fim}
              className={({ isActive }) => `painel__item ${isActive ? 'painel__item--ativo' : ''}`}
            >
              <span aria-hidden="true" style={{ width: 16, textAlign: 'center', color: 'var(--ouro)' }}>
                {m.icone}
              </span>
              {m.nome}
            </NavLink>
          ))}
        </nav>

        <div style={{ marginTop: '1.6rem', paddingTop: '1rem', borderTop: '1px solid var(--linha-suave)' }}>
          <p style={{ fontSize: '0.76rem', color: 'var(--fosco)', margin: '0 0 0.6rem 0.75rem' }}>
            {perfil?.nome}
          </p>
          <Link to="/" className="painel__item">
            ← Ver o site
          </Link>
          <button className="painel__item" style={{ width: '100%' }} onClick={() => sair()}>
            Sair
          </button>
        </div>
      </aside>

      <div style={{ minWidth: 0 }}>
        {modoPrevia && <TarjaPrevia />}
        <div className="painel__corpo">
          <Routes>
            <Route index element={<Resumo />} />
            <Route path="artigos" element={<Artigos />} />
            <Route path="artigo/:slug" element={<Editor />} />
            <Route path="novo" element={<Editor novo />} />
            <Route path="importar" element={<Importar />} />
            <Route path="nucleo" element={<NucleoAdmin />} />
            <Route path="caixa" element={<Caixa />} />
            <Route path="config" element={<Config />} />
            <Route path="ajuda" element={<Ajuda />} />
            <Route path="*" element={<Navigate to="/painel" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function TarjaPrevia() {
  return (
    <div className="tarja-previa">
      <strong>MODO PRÉVIA</strong>
      <span>
        O banco ainda não está ligado. Tudo que você alterar aqui fica só neste navegador, para você
        aprovar as telas — nada vai para o site publicado.
      </span>
      {temRascunho() && (
        <button
          className="btn btn--linha"
          style={{ minHeight: 34, padding: '0.3rem 0.8rem', fontSize: '0.64rem', marginLeft: 'auto' }}
          onClick={() => {
            limparRascunho();
            location.reload();
          }}
        >
          Descartar rascunho local
        </button>
      )}
    </div>
  );
}
