import { Link } from 'react-router-dom';
import type { Artigo } from '../dados/tipos';

export function dataCurta(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function CardArtigo({ a, destaque = false }: { a: Artigo; destaque?: boolean }) {
  return (
    <article className={`cartao ${destaque ? 'cartao--destaque' : ''}`}>
      <div className="cartao__eixo">
        {a.icone && <span aria-hidden="true">{a.icone} </span>}
        {a.eixos[0]}
      </div>

      <h3 className="cartao__titulo">
        <Link to={`/artigo/${a.slug}`} className="cartao__alvo">
          {a.titulo}
        </Link>
      </h3>

      <p className="cartao__resumo">{a.resumo}</p>

      <div className="cartao__pe">
        <span className="mono">{a.minutos} min</span>
        <span aria-hidden="true">·</span>
        <span className="mono">{dataCurta(a.atualizado)}</span>
        {a.premium ? (
          <span className="selo selo--premium" style={{ marginLeft: 'auto' }}>
            Núcleo
          </span>
        ) : (
          <span className="selo selo--aberto" style={{ marginLeft: 'auto' }}>
            Aberto
          </span>
        )}
      </div>
    </article>
  );
}
