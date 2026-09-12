import { Link } from 'react-router-dom';
import Assinatura from '../marca/Assinatura';
import { SITE } from '../dados/configuracao';

export default function Rodape() {
  const ano = new Date().getFullYear();

  return (
    <footer className="rodape nao-imprime">
      <div className="miolo">
        <div className="rodape__grade">
          <div>
            <Assinatura tamanho="medio" />
            <p className="rodape__lema">{SITE.lema}</p>
          </div>

          <nav aria-label="Conteúdo">
            <h3 className="rodape__titulo">Conteúdo</h3>
            <Link to="/biblioteca">Biblioteca aberta</Link>
            <Link to="/eixos">Eixos temáticos</Link>
            <Link to="/nucleo">Núcleo de Estudos</Link>
            <Link to="/livro">Na Terra dos Viventes</Link>
          </nav>

          <nav aria-label="Institucional">
            <h3 className="rodape__titulo">Institucional</h3>
            <Link to="/autor">O autor</Link>
            <Link to="/esclarecimento">Nota de esclarecimento</Link>
            <Link to="/direitos">Direitos autorais</Link>
            <Link to="/privacidade">Privacidade</Link>
            <Link to="/contato">Fale conosco</Link>
          </nav>

          <div>
            <h3 className="rodape__titulo">Apoie</h3>
            <p className="rodape__nota">
              O acervo é aberto e continua aberto. Quem quiser sustentar a pesquisa ajuda por aqui.
            </p>
            <Link to="/apoie" className="btn btn--linha btn--bloco">
              Apoiar a obra
            </Link>
          </div>
        </div>

        <div className="rodape__base">
          <p>
            © {ano} <strong>Eleno Gutemberg</strong>. Todos os direitos reservados. O conteúdo desta
            enciclopédia é obra autoral protegida pela Lei 9.610/98 — a reprodução é livre para
            estudo pessoal e para uso em igreja local, <strong>desde que citada a fonte</strong>; a
            reprodução comercial, total ou parcial, depende de autorização por escrito.
          </p>
          <p className="rodape__credito">
            Feito por{' '}
            <a href="https://gdstudiox.com.br" target="_blank" rel="noopener noreferrer">
              GD Studio X
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
