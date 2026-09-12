import { Link, useNavigate } from 'react-router-dom';
import { useSessao } from '../dados/sessao';

export default function Conta() {
  const { perfil, ehMembro, ehAdmin, sair, modoPrevia } = useSessao();
  const navegar = useNavigate();

  if (!perfil) {
    return (
      <div className="cabeca">
        <div className="miolo">
          <p className="rotulo">Acesso</p>
          <h1>Você não está conectado</h1>
          <p className="olho">A biblioteca continua aberta sem conta nenhuma. A conta serve para o Núcleo.</p>
          <p style={{ marginTop: '1.6rem' }}>
            <Link to="/entrar" className="btn btn--ouro">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="cabeca">
        <div className="miolo">
          <p className="rotulo">Minha conta</p>
          <h1>{perfil.nome || 'Leitor'}</h1>
          <p className="olho">{perfil.email}</p>
        </div>
      </header>

      <section className="secao">
        <div className="miolo" style={{ maxWidth: 760 }}>
          {modoPrevia && (
            <p className="recado recado--aviso" style={{ marginBottom: '1.6rem' }}>
              <strong>Modo prévia.</strong> Esta sessão é local, só para conferir as telas. Nada foi
              gravado em servidor nenhum.
            </p>
          )}

          <div className="ficha">
            <div className="ficha__linha">
              <span>Situação</span>
              <strong>
                {ehMembro ? (
                  <span className="selo selo--premium">Membro do Núcleo</span>
                ) : (
                  <span className="selo selo--aberto">Leitor</span>
                )}
              </strong>
            </div>
            <div className="ficha__linha">
              <span>Papel</span>
              <strong>{perfil.papel}</strong>
            </div>
            {perfil.membroAte && (
              <div className="ficha__linha">
                <span>Acesso até</span>
                <strong>{new Date(perfil.membroAte).toLocaleDateString('pt-BR')}</strong>
              </div>
            )}
          </div>

          <div className="linha" style={{ marginTop: '2rem' }}>
            {ehAdmin && (
              <Link to="/painel" className="btn btn--ouro">
                Abrir o painel
              </Link>
            )}
            {!ehMembro && (
              <Link to="/nucleo" className="btn btn--linha">
                Conhecer o Núcleo
              </Link>
            )}
            <button
              className="btn btn--linha"
              onClick={async () => {
                await sair();
                navegar('/');
              }}
            >
              Sair
            </button>
          </div>
        </div>
      </section>
    </>
  );
}
