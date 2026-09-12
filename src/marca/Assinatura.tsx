import Selo from './Selo';

/**
 * Assinatura da marca: selo + nome. O nome é HTML, não <text> dentro do SVG,
 * justamente para a Cormorant Garamond carregar de verdade.
 */
export default function Assinatura({
  tamanho = 'medio',
  autor = true,
}: {
  tamanho?: 'pequeno' | 'medio' | 'grande';
  autor?: boolean;
}) {
  const selos = { pequeno: 34, medio: 46, grande: 74 } as const;
  const titulos = { pequeno: '0.82rem', medio: '1.05rem', grande: '1.9rem' } as const;
  const subs = { pequeno: '0.53rem', medio: '0.6rem', grande: '0.82rem' } as const;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: tamanho === 'grande' ? '1.15rem' : '0.72rem' }}>
      <Selo tamanho={selos[tamanho]} variante={tamanho === 'pequeno' ? 'compacto' : 'completo'} />
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.05 }}>
        <span
          style={{
            fontFamily: 'var(--serifa)',
            fontSize: titulos[tamanho],
            fontWeight: 600,
            color: 'var(--marfim)',
            letterSpacing: '0.01em',
          }}
        >
          Enciclopédia Teológica
        </span>
        <span
          style={{
            fontFamily: 'var(--interface)',
            fontSize: subs[tamanho],
            fontWeight: 600,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            color: 'var(--ouro)',
            marginTop: tamanho === 'grande' ? '0.5rem' : '0.25rem',
          }}
        >
          e Antropológica
        </span>
        {autor && (
          <span
            style={{
              fontFamily: 'var(--interface)',
              fontSize: subs[tamanho],
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--fosco)',
              marginTop: '0.4rem',
            }}
          >
            Eleno Gutemberg
          </span>
        )}
      </span>
    </span>
  );
}
