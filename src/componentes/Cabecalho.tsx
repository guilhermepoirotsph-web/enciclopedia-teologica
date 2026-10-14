import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import Assinatura from '../marca/Assinatura';
import { useSessao } from '../dados/sessao';

const MENU = [
  { para: '/biblioteca', nome: 'Biblioteca' },
  { para: '/eixos', nome: 'Eixos' },
  { para: '/nucleo', nome: 'Núcleo' },
  { para: '/livro', nome: 'O Livro' },
  { para: '/autor', nome: 'O Autor' },
  { para: '/contato', nome: 'Contato' },
];

export default function Cabecalho() {
  const [solido, setSolido] = useState(false);
  const [aberto, setAberto] = useState(false);
  const { perfil, ehAdmin } = useSessao();
  const local = useLocation();

  useEffect(() => {
    const aoRolar = () => setSolido(window.scrollY > 40);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);

  // Trocar de rota fecha a gaveta — senão o menu fica aberto por cima da
  // página nova e parece que o clique não funcionou.
  useEffect(() => setAberto(false), [local.pathname]);

  useEffect(() => {
    document.body.style.overflow = aberto ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [aberto]);

  return (
    <header className={`topo ${solido ? 'topo--solido' : ''} nao-imprime`}>
      <div className="topo__miolo miolo">
        <Link to="/" aria-label="Página inicial">
          <Assinatura tamanho="pequeno" autor={false} />
        </Link>

        <nav className="topo__nav" aria-label="Principal">
          {MENU.map((m) => (
            <NavLink key={m.para} to={m.para} className={({ isActive }) => `topo__link ${isActive ? 'topo__link--ativo' : ''}`}>
              {m.nome}
            </NavLink>
          ))}
        </nav>

        <div className="topo__acoes">
          {ehAdmin && (
            <Link to="/painel" className="topo__link topo__link--painel">
              Painel
            </Link>
          )}
          {/* Sem botão "Entrar" para o visitante (pedido do Guilherme, 14/10/2026):
              a biblioteca é aberta e o login é só do autor — que entra pelo endereço
              /entrar que recebeu. Quem já está logado continua vendo a própria conta. */}
          {perfil && (
            <Link to="/conta" className="btn btn--linha topo__btn">
              Minha conta
            </Link>
          )}
          <button
            className="topo__hamburguer"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
            aria-label={aberto ? 'Fechar menu' : 'Abrir menu'}
          >
            <span /> <span /> <span />
          </button>
        </div>
      </div>

      <div className={`gaveta ${aberto ? 'gaveta--aberta' : ''}`} hidden={!aberto}>
        <nav className="gaveta__nav" aria-label="Menu">
          {MENU.map((m) => (
            <NavLink key={m.para} to={m.para} className="gaveta__link">
              {m.nome}
            </NavLink>
          ))}
          <NavLink to="/apoie" className="gaveta__link">
            Apoiar a obra
          </NavLink>
          {ehAdmin && (
            <NavLink to="/painel" className="gaveta__link">
              Painel
            </NavLink>
          )}
          {perfil && (
            <NavLink to="/conta" className="gaveta__link gaveta__link--ouro">
              Minha conta
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}
