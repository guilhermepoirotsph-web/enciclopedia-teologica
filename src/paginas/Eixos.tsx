import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Aparece from '../componentes/Aparece';
import { listarEixos } from '../dados/fonte';
import type { Eixo } from '../dados/tipos';

export default function Eixos() {
  const [eixos, setEixos] = useState<Eixo[]>([]);

  useEffect(() => {
    listarEixos().then(setEixos).catch(() => {});
  }, []);

  const total = eixos.reduce((s, e) => s + e.total, 0);

  return (
    <>
      <header className="cabeca">
        <div className="miolo">
          <p className="rotulo">Mapa do acervo</p>
          <h1>Eixos temáticos</h1>
          <p className="olho">
            Cada estudo entra em pelo menos um eixo — alguns em três, porque história, doutrina e
            sociedade raramente andam separadas. São {eixos.length} eixos e {total} entradas ao todo.
          </p>
        </div>
      </header>

      <section className="secao">
        <div className="miolo grade grade--3">
          {eixos.map((e, i) => (
            <Aparece key={e.slug} atraso={Math.min(i, 9) * 45}>
              <Link to={`/eixo/${e.slug}`} className="cartao cartao--eixo">
                <span className="cartao__conta mono">{String(e.total).padStart(2, '0')}</span>
                <h2 className="cartao__titulo">{e.nome}</h2>
                <p className="cartao__resumo">{e.descricao || 'Estudos reunidos sob este tema.'}</p>
                <span className="cartao__seta" aria-hidden="true">→</span>
              </Link>
            </Aparece>
          ))}
        </div>
      </section>
    </>
  );
}
