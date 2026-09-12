import { useState } from 'react';
import Selo from '../marca/Selo';

/**
 * Capa de "Na Terra dos Viventes".
 *
 * Usa a arte real (600x600, quadrada, da 1ª edição de 2026). Se o arquivo
 * sumir ou não carregar, cai numa capa tipográfica em vez de deixar um
 * quadrado quebrado no meio da página — a rede do `onError` existe porque
 * imagem que não carrega é o defeito mais comum de vitrine.
 */
export default function CapaLivro({ moldura = true }: { moldura?: boolean }) {
  const [falhou, setFalhou] = useState(false);

  if (falhou) {
    return (
      <div className="capa-livro">
        <span className="capa-livro__selo">
          <Selo tamanho={38} variante="compacto" />
        </span>
        <span className="capa-livro__titulo">
          Na Terra
          <br />
          dos Viventes
        </span>
        <span className="capa-livro__sub">Espírito, Alma e Corpo</span>
        <span className="capa-livro__autor">Eleno Gutemberg</span>
      </div>
    );
  }

  return (
    <figure className={`capa-real ${moldura ? 'capa-real--moldura' : ''}`}>
      <img
        src="/marca/livro-capa.png"
        alt="Capa do livro Na Terra dos Viventes — Espírito, Alma e Corpo, de Eleno Gutemberg"
        width={600}
        height={600}
        loading="lazy"
        onError={() => setFalhou(true)}
      />
    </figure>
  );
}
