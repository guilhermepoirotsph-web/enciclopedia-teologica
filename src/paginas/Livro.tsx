import Aparece from '../componentes/Aparece';
import CapaLivro from '../componentes/CapaLivro';
import { Link } from 'react-router-dom';
import { SITE } from '../dados/configuracao';

export default function Livro() {
  return (
    <>
      <header className="cabeca">
        <div className="miolo">
          <p className="rotulo">Obra publicada</p>
          <h1>Na Terra dos Viventes</h1>
          <p className="olho">
            Espírito, alma e corpo — o que somos, o que morre e o que atravessa. O livro em que
            Eleno Gutemberg enfrenta a pergunta que quase toda igreja adia.
          </p>
        </div>
      </header>

      <section className="secao">
        <div className="miolo livro-faixa__grade">
          <Aparece className="livro-faixa__capa">
            <CapaLivro />
            <p className="capa-livro__nota">1ª edição, 2026 · Editora DAS — Digital Ars Science</p>
          </Aparece>

          <div>
            <Aparece como="div" className="leitura">
              <p>
                Existe uma pergunta que atravessa o luto, o medo e a fé de qualquer pessoa: o que
                exatamente permanece quando o corpo para? A resposta de púlpito costuma ser curta
                demais, e a resposta da filosofia costuma ser longa demais para servir de consolo.
              </p>
              <p>
                <strong>Na Terra dos Viventes</strong> encara a constituição do ser humano com o
                mesmo método dos estudos deste acervo: texto no contexto, palavra no original,
                história onde a história ajuda. Espírito, alma e corpo deixam de ser três palavras
                repetidas no culto e passam a ser três realidades com função, origem e destino.
              </p>
              <p>
                É um livro para quem já leu superficialidade suficiente sobre o assunto e quer ver a
                questão tratada por inteiro — inclusive nas partes em que a resposta honesta é
                &ldquo;o texto não diz&rdquo;.
              </p>
            </Aparece>

            <Aparece className="compra" atraso={120}>
              <h2>Onde comprar</h2>
              <p>
                O livro é vendido pela Hotmart, na página oficial do autor. O pagamento e a entrega
                acontecem inteiramente lá.
              </p>
              <a href={SITE.hotmart} target="_blank" rel="noopener noreferrer" className="btn btn--ouro btn--bloco">
                Comprar na Hotmart
              </a>
              <p className="compra__nota">
                Você será levado para <span className="mono">go.hotmart.com</span> — a plataforma
                oficial de venda.
              </p>
            </Aparece>
          </div>
        </div>
      </section>

      <section className="secao secao--pedra">
        <div className="miolo centro">
          <h2 className="secao__titulo" style={{ margin: '0 auto 1rem' }}>
            Antes de comprar, leia o autor de graça
          </h2>
          <p className="olho" style={{ margin: '0 auto 1.8rem' }}>
            Os estudos sobre natureza humana, alma e destino eterno estão abertos na biblioteca.
            Leia primeiro, decida depois.
          </p>
          <div className="linha" style={{ justifyContent: 'center' }}>
            <Link to="/eixo/antropologia" className="btn btn--ouro">
              Estudos de Antropologia
            </Link>
            <Link to="/eixo/escatologia" className="btn btn--linha">
              Estudos de Escatologia
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
