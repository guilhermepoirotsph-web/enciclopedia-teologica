import { Suspense, lazy, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Cabecalho from './componentes/Cabecalho';
import Rodape from './componentes/Rodape';
import Barreira from './componentes/Barreira';
import ControleRadio from './componentes/ControleRadio';
import Inicio from './paginas/Inicio';
import Biblioteca from './paginas/Biblioteca';
import Artigo from './paginas/Artigo';
import Eixos from './paginas/Eixos';
import { useSessao } from './dados/sessao';

const Nucleo = lazy(() => import('./paginas/Nucleo'));
const Livro = lazy(() => import('./paginas/Livro'));
const Autor = lazy(() => import('./paginas/Autor'));
const Apoie = lazy(() => import('./paginas/Apoie'));
const Contato = lazy(() => import('./paginas/Contato'));
const Entrar = lazy(() => import('./paginas/Entrar'));
const Conta = lazy(() => import('./paginas/Conta'));
const Institucional = lazy(() => import('./paginas/Institucional'));
const Painel = lazy(() => import('./paginas/painel/Painel'));

/** Rola para o topo a cada troca de rota — menos quando há âncora. */
function AoTrocarDeRota() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);
  return null;
}

/**
 * Porteiro do painel.
 * Esconder a rota não protege dado nenhum — quem protege é a RLS do banco.
 * Isto aqui é só para o visitante não cair numa tela quebrada.
 */
function Protegida({ children }: { children: React.ReactNode }) {
  const { ehAdmin, carregando } = useSessao();
  if (carregando) return <Carregando />;
  if (!ehAdmin) return <Navigate to="/entrar?destino=/painel" replace />;
  return <>{children}</>;
}

function Carregando() {
  return (
    <div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', color: 'var(--fosco)' }}>
      <p className="rotulo">carregando…</p>
    </div>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const noPainel = pathname.startsWith('/painel');

  return (
    <>
      <AoTrocarDeRota />
      {!noPainel && <Cabecalho />}
      <main id="conteudo">
        <Barreira>
          <Suspense fallback={<Carregando />}>
          <Routes>
            <Route path="/" element={<Inicio />} />
            <Route path="/biblioteca" element={<Biblioteca />} />
            <Route path="/eixos" element={<Eixos />} />
            <Route path="/eixo/:slug" element={<Biblioteca />} />
            <Route path="/artigo/:slug" element={<Artigo />} />
            <Route path="/nucleo" element={<Nucleo />} />
            <Route path="/livro" element={<Livro />} />
            <Route path="/autor" element={<Autor />} />
            <Route path="/apoie" element={<Apoie />} />
            <Route path="/contato" element={<Contato />} />
            <Route path="/entrar" element={<Entrar />} />
            <Route path="/conta" element={<Conta />} />
            <Route path="/esclarecimento" element={<Institucional pagina="esclarecimento" />} />
            <Route path="/direitos" element={<Institucional pagina="direitos" />} />
            <Route path="/privacidade" element={<Institucional pagina="privacidade" />} />
            <Route
              path="/painel/*"
              element={
                <Protegida>
                  <Painel />
                </Protegida>
              }
            />
            <Route path="*" element={<Institucional pagina="perdida" />} />
          </Routes>
          </Suspense>
        </Barreira>
      </main>
      {!noPainel && <Rodape />}
      {/* Fora das rotas de proposito: assim a trilha NAO recomeca a cada
          navegacao — que e o que faz dela uma radio e nao um efeito sonoro. */}
      {!noPainel && <ControleRadio />}
    </>
  );
}
