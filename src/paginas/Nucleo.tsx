import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Aparece from '../componentes/Aparece';
import Selo from '../marca/Selo';
import { listarObras } from '../dados/fonte';
import { SITE } from '../dados/configuracao';
import type { Obra } from '../dados/tipos';

const TIPO = {
  livro: 'Livro',
  serie: 'Série de estudos',
  curso: 'Curso',
  plano: 'Assinatura',
} as const;

export default function Nucleo() {
  const [obras, setObras] = useState<Obra[]>([]);

  useEffect(() => {
    listarObras().then((o) => setObras(o.filter((x) => x.ativo))).catch(() => {});
  }, []);

  const prontas = obras.filter((o) => !o.exemplo);
  const preparo = obras.filter((o) => o.exemplo);

  return (
    <>
      <header className="cabeca">
        <div className="miolo">
          <p className="rotulo">Conteúdo aprofundado</p>
          <h1>Núcleo de Estudos</h1>
          <p className="olho">
            A biblioteca é aberta e vai continuar aberta — 97 estudos, sem login, sem cobrança. O
            Núcleo existe para quem já leu e quer ir além: material organizado em ordem de leitura,
            aparato de apoio e acesso direto ao autor.
          </p>
        </div>
      </header>

      {/* ---- a promessa, antes do preço ---- */}
      <section className="secao">
        <div className="miolo">
          <div className="promessa">
            {[
              ['Ordem de leitura', 'Os estudos deixam de ser lista e viram percurso: o que ler primeiro, o que depende do quê.'],
              ['Aparato completo', 'Referências, cronologias, léxico e as fontes que sustentam cada afirmação do texto.'],
              ['Pergunta respondida', 'Dúvida de membro entra na fila do autor — e a resposta vira material para todos.'],
              ['Material para ensinar', 'Roteiro pronto para levar ao grupo, à célula ou à classe de escola bíblica.'],
            ].map(([t, d], i) => (
              <Aparece key={t} className="promessa__item" atraso={i * 60}>
                <h2>{t}</h2>
                <p>{d}</p>
              </Aparece>
            ))}
          </div>
        </div>
      </section>

      {/* ---- o que já existe ---- */}
      {prontas.length > 0 && (
        <section className="secao secao--pedra">
          <div className="miolo">
            <div className="filete">
              <span className="rotulo">Disponível agora</span>
            </div>
            <h2 className="secao__titulo">Publicado e à venda</h2>

            <div className="grade grade--2" style={{ marginTop: '2.4rem' }}>
              {prontas.map((o) => (
                <Aparece key={o.slug}>
                  <ObraCartao o={o} />
                </Aparece>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ---- o que está sendo preparado ---- */}
      {preparo.length > 0 && (
        <section className="secao">
          <div className="miolo">
            <div className="filete">
              <span className="rotulo">Em preparação</span>
            </div>
            <h2 className="secao__titulo">O que vem pela frente</h2>
            <p className="olho">
              Estas três frentes estão em produção. Elas aparecem aqui com a tarja de preparação
              justamente porque ainda não estão prontas — quando estiverem, entram no lugar da tarja
              com preço e botão de compra.
            </p>

            <div className="grade grade--3" style={{ marginTop: '2.4rem' }}>
              {preparo.map((o, i) => (
                <Aparece key={o.slug} atraso={i * 60}>
                  <ObraCartao o={o} />
                </Aparece>
              ))}
            </div>

            <div className="aviso-lista" style={{ marginTop: '2.6rem' }}>
              <Selo tamanho={40} variante="compacto" />
              <div>
                <h3>Quer saber na hora em que abrir?</h3>
                <p>
                  Deixe seu e-mail e você recebe um aviso — um por lançamento, nada além disso.
                </p>
              </div>
              <Link to="/contato#avise" className="btn btn--ouro">
                Quero ser avisado
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ---- apoio ---- */}
      <section className="secao secao--pedra">
        <div className="miolo centro">
          <h2 className="secao__titulo" style={{ margin: '0 auto 1rem' }}>
            Não quer assinar nada e mesmo assim quer ajudar?
          </h2>
          <p className="olho" style={{ margin: '0 auto 1.8rem' }}>
            O acervo aberto tem custo de hospedagem, de tempo e de pesquisa. Uma contribuição de
            R$ {SITE.apoioSugerido},00 já sustenta.
          </p>
          <Link to="/apoie" className="btn btn--ouro">
            Apoiar a obra
          </Link>
        </div>
      </section>
    </>
  );
}

function ObraCartao({ o }: { o: Obra }) {
  return (
    <article className={`cartao obra ${o.exemplo ? 'obra--preparo' : ''}`}>
      {o.capa && (
        <div className="obra__capa">
          <img src={o.capa} alt={`Capa de ${o.titulo}`} loading="lazy" />
        </div>
      )}
      <div className="cartao__eixo">{TIPO[o.tipo]}</div>
      <h3 className="cartao__titulo">{o.titulo}</h3>
      {o.subtitulo && <p className="obra__sub">{o.subtitulo}</p>}
      <p className="cartao__resumo" style={{ WebkitLineClamp: 5 }}>
        {o.descricao}
      </p>

      <div className="cartao__pe">
        {o.exemplo ? (
          <span className="selo selo--aviso">Em preparação</span>
        ) : o.linkExterno ? (
          <a href={o.linkExterno} target="_blank" rel="noopener noreferrer" className="btn btn--ouro btn--bloco">
            Comprar
          </a>
        ) : (
          <span className="selo selo--aberto">Disponível</span>
        )}
      </div>
    </article>
  );
}
