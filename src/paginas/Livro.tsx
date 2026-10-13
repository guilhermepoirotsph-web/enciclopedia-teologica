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
            Espírito, Alma e Corpo — a origem, a natureza e o destino do ser humano à luz das
            Escrituras, por Eleno Gutemberg Silva.
          </p>
        </div>
      </header>

      <section className="secao">
        <div className="miolo livro-faixa__grade">
          <Aparece className="livro-faixa__capa">
            <CapaLivro />
            <p className="capa-livro__nota">1ª edição, 2026 · Editora DAS — Digital Ars Science</p>
            <dl className="ficha-livro">
              <div><dt>Formato</dt><dd>eBook</dd></div>
              <div><dt>Idioma</dt><dd>Português</dd></div>
              <div><dt>Preço</dt><dd>R$ 25,00</dd></div>
              <div><dt>Garantia</dt><dd>7 dias, pela Hotmart</dd></div>
            </dl>
          </Aparece>

          <div>
            <Aparece como="div" className="leitura">
              <p>
                Este livro apresenta uma reflexão profunda sobre a origem, a natureza e o destino do
                ser humano à luz das Escrituras. Explora o propósito divino na criação do homem, a
                sua queda e o plano perfeito de redenção em Jesus Cristo, o segundo Adão.
              </p>
              <p>
                A obra mostra como o homem, criado à imagem de Deus, foi limitado pelo corpo para
                amadurecer espiritualmente e alcançar a perfeição moral — e explica a diferença entre
                corpo, alma e espírito, e o papel de cada um na formação do ser completo.
              </p>
              <p>
                Com base em passagens bíblicas e numa análise espiritual detalhada, o texto aborda a
                rebeldia de Lúcifer, a morte e a imortalidade, o juízo eterno, a vitória de Cristo
                sobre o pecado e a morte, o livre-arbítrio e a soberania de Deus.
              </p>
              <p>
                Mais do que um estudo teológico, é um convite à reflexão sobre a vida eterna, a
                consciência espiritual e o propósito do homem: viver em comunhão perfeita com o
                Criador.
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
