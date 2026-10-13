import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Aparece from '../componentes/Aparece';
import RetratoAutor from '../componentes/RetratoAutor';
import { listarArtigos, listarEixos } from '../dados/fonte';
import { SITE } from '../dados/configuracao';
import type { Artigo, Eixo } from '../dados/tipos';

export default function Autor() {
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [eixos, setEixos] = useState<Eixo[]>([]);

  useEffect(() => {
    listarArtigos().then(setArtigos).catch(() => {});
    listarEixos().then(setEixos).catch(() => {});
  }, []);

  const maiores = [...artigos].sort((a, b) => b.palavras - a.palavras).slice(0, 5);

  return (
    <>
      <header className="cabeca">
        <div className="miolo">
          <p className="rotulo">Quem escreve</p>
          <h1>Eleno Gutemberg Silva</h1>
          <p className="olho">
            Pastor evangélico, capelão evangélico no sistema prisional, professor de ensino
            bíblico e escritor, com formação básica em Teologia. Mantém esta enciclopédia desde
            abril de 2026 e é autor de{' '}
            <em>Na Terra dos Viventes — Espírito, Alma e Corpo</em>.
          </p>
        </div>
      </header>

      <section className="secao">
        <div className="miolo autor">
          <Aparece className="autor__retrato">
            <div className="autor__moldura autor__moldura--foto">
              <RetratoAutor />
            </div>
          </Aparece>

          <Aparece como="div" className="leitura" atraso={90}>
            <h2>Biografia</h2>
            <p>
              Eleno Gutemberg Silva é pastor evangélico, professor de ensino bíblico, educador
              cristão e escritor, com formação básica em Teologia. Casado com Renata Gutemberg e pai
              de duas filhas, dedica-se ao estudo das
              Escrituras e à produção de conteúdos que unem fundamento bíblico, clareza didática e
              aplicação prática para a vida cristã.
            </p>
            <p>
              Atua também como capelão evangélico no sistema prisional — um ministério que leva a
              Palavra a quem está privado de liberdade e que dá peso concreto aos temas que atravessam
              este acervo: culpa, arrependimento, redenção e dignidade humana à luz das Escrituras.
            </p>
            <p>
              O trabalho dele é voltado à formação espiritual de leitores que desejam compreender a
              Bíblia de forma simples, profunda e responsável — fortalecendo a fé, o discernimento e
              os valores cristãos. Escreve para edificar, instruir e auxiliar pessoas, famílias e
              comunidades no crescimento espiritual.
            </p>
            <p>
              Como autor cristão, assume compromisso com a verdade bíblica, a ética cristã e o ensino
              acessível, buscando responder aos desafios do tempo presente à luz das Escrituras.
            </p>

            <h2>O acervo</h2>
            <p>
              Eleno Gutemberg escreve sobre teologia bíblica, história antiga e o encontro entre fé e
              sociedade. O acervo que ele mantém não é um blog de opinião: é uma enciclopédia — os
              textos são datados, revisados e corrigidos quando a pesquisa exige.
            </p>
            <p>
              O método aparece com clareza nos estudos: a afirmação vem depois da passagem, a
              passagem vem dentro do contexto, e o contexto é reconstruído com o que a arqueologia,
              a etnologia e a história antiga têm a dizer. Quando duas leituras legítimas disputam o
              mesmo texto — Calvino e Armínio, por exemplo — as duas aparecem antes da conclusão.
            </p>
            <p>
              Os temas vão do exame verso a verso de Filipenses às dez virgens de Mateus 25, do
              contexto histórico do Êxodo à discussão sobre igreja e política, do espiritismo
              kardecista à teodiceia. São {artigos.length || 97} estudos em {eixos.length || 32}{' '}
              eixos temáticos, todos abertos.
            </p>

            <h2>Uma nota sobre discordância</h2>
            <p>
              O autor deixa registrado, na abertura do acervo, que os artigos não pretendem ofender
              convicções pessoais, e que tudo ali é apresentado no campo do debate intelectual e
              religioso — cabendo ao leitor, no exercício da própria autonomia crítica, aderir ou
              não às teses apresentadas. Correção bem fundamentada é bem-vinda e já mudou texto
              publicado.
            </p>
          </Aparece>
        </div>
      </section>

      <section className="secao">
        <div className="miolo familia">
          <Aparece como="div" className="leitura">
            <p className="rotulo">Família e responsabilidade</p>
            <h2>Antes do púlpito, a casa</h2>
            <p>
              Eleno é casado com Renata Gutemberg e pai de duas filhas. É em casa que o ensino dele
              começa: a fé que aparece nos estudos é a mesma que se pratica à mesa, na rotina e nas
              decisões de cada dia.
            </p>
            <p>
              Como pastor, ele entende o ministério como responsabilidade — com a família, com a
              igreja e com quem está à margem. A capelania no sistema prisional nasce desse mesmo
              compromisso: levar a Palavra com seriedade a quem mais precisa ouvir que ainda há
              caminho de volta.
            </p>
            <p>
              É por isso que os temas de família, casamento e criação de filhos ocupam um lugar
              próprio neste acervo. Não são teoria: são o chão onde a doutrina é posta à prova.
            </p>
            <Link to="/eixo/familia" className="btn btn--linha" style={{ marginTop: '1rem' }}>
              Estudos sobre família
            </Link>
          </Aparece>

          <Aparece className="familia__foto" atraso={90}>
            <picture>
              <source srcSet="/marca/eleno-familia.webp" type="image/webp" />
              <img
                src="/marca/eleno-familia.jpg"
                alt="Eleno Gutemberg com a esposa, Renata, e as duas filhas"
                width={720}
                height={900}
                loading="lazy"
                decoding="async"
              />
            </picture>
          </Aparece>
        </div>
      </section>

      {maiores.length > 0 && (
        <section className="secao secao--pedra">
          <div className="miolo">
            <div className="filete">
              <span className="rotulo">Trabalhos mais extensos</span>
            </div>
            <h2 className="secao__titulo">Onde ele foi mais fundo</h2>

            <ol className="lista-numerada">
              {maiores.map((a, i) => (
                <li key={a.slug}>
                  <span className="mono">{String(i + 1).padStart(2, '0')}</span>
                  <Link to={`/artigo/${a.slug}`}>
                    <strong>{a.titulo}</strong>
                    <span className="fosco">
                      {a.eixos.join(' · ')} — {a.minutos} min
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      <section className="secao">
        <div className="miolo centro">
          <h2 className="secao__titulo" style={{ margin: '0 auto 1.6rem' }}>
            Falar com o autor
          </h2>
          <div className="linha" style={{ justifyContent: 'center' }}>
            <Link to="/contato" className="btn btn--ouro">
              Enviar mensagem
            </Link>
            <a href={SITE.hotmart} target="_blank" rel="noopener noreferrer" className="btn btn--linha">
              Conhecer o livro
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
