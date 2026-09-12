import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Barreira de erro.
 *
 * Sem ela, qualquer exceção durante a renderização desmonta a árvore inteira e
 * o visitante fica com a TELA PRETA — sem mensagem, sem botão, sem ideia do que
 * fazer. Foi exatamente o que aconteceu quando o `pin` do ScrollTrigger mexeu
 * no DOM por baixo do React: um clique em qualquer link apagava o site.
 *
 * O defeito daquela vez está corrigido. Esta barreira existe para o próximo:
 * a página quebra, mas o site continua navegável e o leitor sabe para onde ir.
 */
type Props = { children: ReactNode };
type Estado = { quebrou: boolean; mensagem: string };

export default class Barreira extends Component<Props, Estado> {
  state: Estado = { quebrou: false, mensagem: '' };

  static getDerivedStateFromError(erro: unknown): Estado {
    return { quebrou: true, mensagem: erro instanceof Error ? erro.message : String(erro) };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    // Fica no console para quem for investigar; nada é enviado para fora.
    console.error('[enciclopedia] a página quebrou:', erro, info.componentStack);
  }

  render() {
    if (!this.state.quebrou) return this.props.children;

    return (
      <section className="cabeca" style={{ minHeight: '70vh' }}>
        <div className="miolo">
          <p className="rotulo">Algo falhou aqui</p>
          <h1>Esta página não conseguiu abrir</h1>
          <p className="olho">
            O problema é desta tela, não do acervo: os estudos continuam no ar. Recarregue a
            página ou volte para a biblioteca.
          </p>

          <div className="linha" style={{ marginTop: '1.8rem' }}>
            <button className="btn btn--ouro" onClick={() => location.reload()}>
              Recarregar
            </button>
            {/* href de verdade, não Link: se o roteador for justamente o que
                quebrou, um Link não levaria a lugar nenhum. */}
            <a className="btn btn--linha" href={import.meta.env.BASE_URL}>
              Voltar ao início
            </a>
            <a className="btn btn--linha" href={import.meta.env.BASE_URL + 'biblioteca'}>
              Ir para a biblioteca
            </a>
          </div>

          {this.state.mensagem && (
            <p className="fosco" style={{ marginTop: '2rem', fontSize: '0.78rem' }}>
              Detalhe técnico: {this.state.mensagem}
            </p>
          )}
        </div>
      </section>
    );
  }
}
