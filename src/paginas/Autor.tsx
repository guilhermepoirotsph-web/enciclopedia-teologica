import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Aparece from '../componentes/Aparece';
import Selo from '../marca/Selo';
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
          <h1>Eleno Gutemberg</h1>
          <p className="olho">
            Pesquisador e escritor. Mantém esta enciclopédia desde abril de 2026, com revisão
            contínua de cada estudo — e é autor de <em>Na Terra dos Viventes — Espírito, Alma e Corpo</em>.
          </p>
        </div>
      </header>

      <section className="secao">
        <div className="miolo autor">
          <Aparece className="autor__retrato">
            <div className="autor__moldura">
              <Selo tamanho={150} />
            </div>
            <p className="capa-livro__nota">
              Retrato do autor a enviar — até lá, o selo da enciclopédia ocupa o lugar.
            </p>
          </Aparece>

          <Aparece como="div" className="leitura" atraso={90}>
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
