import { Link } from 'react-router-dom';
import { SITE } from '../dados/configuracao';

type Pagina = 'esclarecimento' | 'direitos' | 'privacidade' | 'perdida';

export default function Institucional({ pagina }: { pagina: Pagina }) {
  const conteudo = MAPA[pagina];

  return (
    <>
      <header className="cabeca">
        <div className="miolo">
          <p className="rotulo">{conteudo.rotulo}</p>
          <h1>{conteudo.titulo}</h1>
          {conteudo.olho && <p className="olho">{conteudo.olho}</p>}
        </div>
      </header>

      <section className="secao">
        <div className="miolo">{conteudo.corpo}</div>
      </section>
    </>
  );
}

const MAPA: Record<Pagina, { rotulo: string; titulo: string; olho?: string; corpo: JSX.Element }> = {
  /* ------------------------------------------------------- esclarecimento */
  esclarecimento: {
    rotulo: 'Institucional',
    titulo: 'Nota de esclarecimento',
    olho: 'A posição editorial deste acervo, na íntegra e sem paráfrase.',
    corpo: (
      <div className="leitura">
        <p>
          Estes artigos não têm o intuito de ofender indivíduos, suas convicções ou orientações
          pessoais. Nosso objetivo é, respeitosamente, apresentar nosso posicionamento fundamentado
          nas Escrituras Sagradas. Reconhecemos que vivemos em um Estado laico e democrático, onde a
          liberdade de expressão, de crença e de comportamento é um direito fundamental de todos.
        </p>
        <p>
          Os conteúdos são produzidos sob o amparo do <strong>Artigo 5º da Constituição Federal de
          1988</strong>, que garante a livre manifestação do pensamento e a inviolabilidade da
          liberdade de consciência e de crença. Ademais, os presentes conteúdos fundamentam-se no
          princípio da <strong>liberdade acadêmica e de cátedra</strong>, que assegura a autonomia
          para o estudo, a pesquisa e a exposição de pensamentos históricos e teológicos como
          ferramentas de debate social.
        </p>
        <p>
          Reiteramos que o objetivo destas publicações é o exercício do pluralismo de ideias,
          permanecendo estritamente no campo do debate intelectual e religioso, cabendo
          exclusivamente ao leitor, no exercício de sua própria autonomia crítica, a livre adesão ou
          não às teses aqui apresentadas.
        </p>

        <h2>Revisão e correção</h2>
        <p>
          Os artigos passam por revisões periódicas para garantir a atualidade e a precisão das
          informações. O conhecimento é dinâmico: correções bem fundamentadas são bem-vindas e já
          alteraram texto publicado. Cada estudo exibe a data da última revisão.
        </p>
        <p>
          <Link to="/contato" className="esclarecimento__link">
            Apontar uma correção →
          </Link>
        </p>
      </div>
    ),
  },

  /* ------------------------------------------------------------- direitos */
  direitos: {
    rotulo: 'Institucional',
    titulo: 'Direitos autorais e uso do conteúdo',
    olho: 'O que você pode fazer com estes textos sem precisar pedir, e o que precisa de autorização.',
    corpo: (
      <div className="leitura">
        <p>
          Todo o conteúdo desta enciclopédia — textos, títulos, organização em eixos temáticos,
          identidade visual e seleção editorial — é obra autoral de <strong>{SITE.autor}</strong>,
          protegida pela <strong>Lei 9.610/1998</strong>, que trata dos direitos autorais no Brasil.
        </p>

        <h2>Pode, sem pedir autorização</h2>
        <ul>
          <li>Ler, imprimir e guardar qualquer estudo para uso pessoal.</li>
          <li>
            Usar o material em sua <strong>igreja local</strong>: classe de escola bíblica, célula,
            grupo de estudo, pregação — citando o autor e o endereço deste site.
          </li>
          <li>
            Citar trechos em trabalhos acadêmicos, artigos e redes sociais, com indicação de fonte e
            autoria.
          </li>
          <li>Compartilhar o link de qualquer artigo, livremente.</li>
        </ul>

        <h2>Precisa de autorização por escrito</h2>
        <ul>
          <li>Reproduzir artigos integralmente em outro site, blog ou publicação.</li>
          <li>Qualquer uso comercial: venda, apostila paga, curso pago, compilação impressa.</li>
          <li>Criar obra derivada, tradução ou adaptação para outro formato.</li>
          <li>Usar o nome, o selo ou a identidade visual da enciclopédia.</li>
        </ul>

        <h2>Como citar</h2>
        <blockquote className="versiculo">
          GUTEMBERG, Eleno. <em>Título do estudo</em>. Enciclopédia Teológica e Antropológica.
          Disponível em: &lt;endereço do artigo&gt;. Acesso em: data.
        </blockquote>

        <h2>Sobre as Escrituras citadas</h2>
        <p>
          As passagens bíblicas reproduzidas nos estudos são citações de texto sagrado em domínio
          público ou usadas dentro do direito de citação previsto no artigo 46 da mesma lei. A
          análise, o comentário e o encadeamento em torno delas são autorais.
        </p>

        <h2>Uma observação honesta sobre cópia</h2>
        <p>
          Nenhum site impede tecnicamente que alguém copie um texto: qualquer página que o navegador
          exibe pode ser lida. O que este site faz é registrar autoria com data, manter o texto
          publicado em endereço próprio e deixar as regras de uso escritas — que é o que vale numa
          disputa. Prometer &ldquo;proteção contra cópia&rdquo; seria vender o que não existe.
        </p>

        <p>
          <Link to="/contato" className="esclarecimento__link">
            Solicitar autorização de uso →
          </Link>
        </p>
      </div>
    ),
  },

  /* ----------------------------------------------------------- privacidade */
  privacidade: {
    rotulo: 'Institucional',
    titulo: 'Privacidade',
    olho: 'O que este site coleta — que é pouco — e o que faz com isso.',
    corpo: (
      <div className="leitura">
        <h2>Para ler, nada é pedido</h2>
        <p>
          Os estudos da biblioteca são abertos. Não há login para ler, não há muro de cadastro e não
          há rastreamento de publicidade nas páginas de leitura.
        </p>

        <h2>O que é coletado, e só quando você envia</h2>
        <ul>
          <li>
            <strong>Formulário de contato:</strong> nome, e-mail, assunto e mensagem — guardados para
            que o autor possa responder.
          </li>
          <li>
            <strong>Lista de avisos:</strong> nome e e-mail, usados exclusivamente para avisar sobre
            novos estudos. Nunca vendidos, cedidos ou usados em mala direta de terceiros.
          </li>
          <li>
            <strong>Conta de membro:</strong> e-mail e nome, necessários para dar acesso ao Núcleo. A
            senha é guardada de forma cifrada pelo provedor de autenticação — nem o autor nem a
            equipe técnica conseguem lê-la.
          </li>
        </ul>

        <h2>Seus direitos (LGPD)</h2>
        <p>
          Você pode pedir, a qualquer momento, a confirmação do que existe sobre você, a correção
          desses dados ou a exclusão completa — inclusive o cancelamento da lista de avisos. O
          pedido é atendido pelo canal de contato e não exige justificativa.
        </p>

        <h2>Serviços de terceiros</h2>
        <p>
          A compra do livro acontece na <strong>Hotmart</strong>, fora deste site, e é regida pela
          política de privacidade dela. Se você clicar para pagar, os dados de pagamento são
          tratados lá — este site não vê, não recebe e não guarda dado de cartão.
        </p>

        <p>
          <Link to="/contato" className="esclarecimento__link">
            Exercer um direito sobre seus dados →
          </Link>
        </p>
      </div>
    ),
  },

  /* --------------------------------------------------------------- perdida */
  perdida: {
    rotulo: 'Erro 404',
    titulo: 'Esta página não existe',
    olho: 'O endereço pode ter mudado de lugar. O acervo inteiro continua a um clique.',
    corpo: (
      <div className="linha">
        <Link to="/biblioteca" className="btn btn--ouro">
          Ir para a biblioteca
        </Link>
        <Link to="/" className="btn btn--linha">
          Voltar ao início
        </Link>
      </div>
    ),
  },
};
