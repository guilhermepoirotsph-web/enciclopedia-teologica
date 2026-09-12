import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Selo from '../marca/Selo';
import { useSessao } from '../dados/sessao';

export default function Entrar() {
  const { entrar, cadastrar, entrarPrevia, modoPrevia, perfil } = useSessao();
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const destino = params.get('destino') || '/conta';

  const [aba, setAba] = useState<'entrar' | 'criar'>('entrar');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [criado, setCriado] = useState(false);

  // Quem já está autenticado não tem o que fazer nesta tela. Navegar é efeito
  // colateral e por isso acontece depois da renderização, nunca durante.
  useEffect(() => {
    if (perfil && !criado) navegar(destino, { replace: true });
  }, [perfil, criado, destino, navegar]);

  async function submeter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setErro('');
    setOcupado(true);

    const r =
      aba === 'entrar'
        ? await entrar(String(f.get('email')), String(f.get('senha')))
        : await cadastrar(String(f.get('nome')), String(f.get('email')), String(f.get('senha')));

    setOcupado(false);
    if (!r.ok) {
      setErro(r.erro || 'Não deu certo.');
      return;
    }
    if (aba === 'criar') setCriado(true);
    else navegar(destino, { replace: true });
  }

  return (
    <section className="entrada">
      <div className="entrada__caixa">
        <Link to="/" className="entrada__selo" aria-label="Página inicial">
          <Selo tamanho={62} />
        </Link>

        <h1>{aba === 'entrar' ? 'Entrar' : 'Criar conta'}</h1>
        <p className="fosco" style={{ fontSize: '0.9rem' }}>
          A biblioteca é aberta e não exige conta. O login serve para o Núcleo de Estudos e para o
          painel do autor.
        </p>

        <div className="entrada__abas">
          <button
            className={aba === 'entrar' ? 'entrada__aba entrada__aba--ativa' : 'entrada__aba'}
            onClick={() => setAba('entrar')}
          >
            Já tenho conta
          </button>
          <button
            className={aba === 'criar' ? 'entrada__aba entrada__aba--ativa' : 'entrada__aba'}
            onClick={() => setAba('criar')}
          >
            Criar conta
          </button>
        </div>

        {criado ? (
          <div className="recado recado--ok">
            Conta criada. Confirme o e-mail que acabou de chegar e depois volte para entrar.
          </div>
        ) : (
          <form onSubmit={submeter}>
            {aba === 'criar' && (
              <label className="campo">
                <span>Nome</span>
                <input name="nome" required maxLength={90} autoComplete="name" />
              </label>
            )}

            <label className="campo">
              <span>E-mail</span>
              <input name="email" type="email" required autoComplete="email" />
            </label>

            <label className="campo">
              <span>Senha</span>
              <input
                name="senha"
                type="password"
                required
                minLength={6}
                autoComplete={aba === 'entrar' ? 'current-password' : 'new-password'}
              />
            </label>

            {erro && <p className="recado recado--erro">{erro}</p>}

            <button className="btn btn--ouro btn--bloco" disabled={ocupado} style={{ marginTop: '0.6rem' }}>
              {ocupado ? 'Um instante…' : aba === 'entrar' ? 'Entrar' : 'Criar minha conta'}
            </button>
          </form>
        )}

        {modoPrevia && (
          <div className="entrada__previa">
            <p className="rotulo">Modo prévia</p>
            <p>
              O banco ainda não está ligado, então não existe conta de verdade para entrar. Use os
              acessos abaixo para percorrer as telas e aprovar o layout — nada é salvo no servidor e
              nenhuma senha real é usada.
            </p>
            <div className="linha">
              <button className="btn btn--linha" onClick={() => { entrarPrevia('admin'); navegar('/painel'); }}>
                Ver o painel do autor
              </button>
              <button className="btn btn--linha" onClick={() => { entrarPrevia('membro'); navegar('/conta'); }}>
                Ver como membro
              </button>
            </div>
          </div>
        )}

        <p className="entrada__voltar">
          <Link to="/">← Voltar para a enciclopédia</Link>
        </p>
      </div>
    </section>
  );
}
