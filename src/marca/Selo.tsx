import { useId } from 'react';

/**
 * Selo "Pórtico da Luz".
 *
 * Leitura do símbolo, de fora para dentro:
 *   anel        — o cânon, o círculo fechado da revelação escrita
 *   doze raios  — as doze tribos / os doze apóstolos (só na variante grande)
 *   ogiva       — o pórtico do templo: a porta pela qual se entra para estudar
 *   cruz de luz — o eixo do Evangelho, que nasce do livro e sobe
 *   livro       — as Escrituras abertas, a base de tudo que se afirma aqui
 *
 * Não tem texto dentro do SVG de propósito: quando um SVG com <text> entra como
 * <img> (favicon, og:image, e-mail), a fonte da web não carrega e o nome sai
 * numa fonte de sistema qualquer. O nome é sempre desenhado em HTML, ao lado.
 */
export default function Selo({
  tamanho = 44,
  variante = 'completo',
  cor = 'var(--ouro)',
  brilho = 'var(--ouro-luz)',
  className,
}: {
  tamanho?: number;
  variante?: 'completo' | 'compacto';
  cor?: string;
  brilho?: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  const luz = `luz-${id}`;
  const raios = Array.from({ length: 12 }, (_, i) => i * 30);

  return (
    <svg
      viewBox="0 0 72 72"
      width={tamanho}
      height={tamanho}
      className={className}
      role="img"
      aria-label="Selo da Enciclopédia Teológica e Antropológica"
    >
      <defs>
        <linearGradient id={luz} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={brilho} stopOpacity="1" />
          <stop offset="62%" stopColor={cor} stopOpacity="0.95" />
          <stop offset="100%" stopColor={cor} stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {/* anel do cânon */}
      <circle cx="36" cy="36" r="34" fill="none" stroke={cor} strokeWidth="1.5" />

      {variante === 'completo' && (
        <>
          <circle cx="36" cy="36" r="30.5" fill="none" stroke={cor} strokeWidth="0.5" opacity="0.4" />
          <g stroke={cor} strokeWidth="1" opacity="0.75" strokeLinecap="round">
            {raios.map((a) => (
              <line
                key={a}
                x1={36 + 30.8 * Math.cos((a * Math.PI) / 180)}
                y1={36 + 30.8 * Math.sin((a * Math.PI) / 180)}
                x2={36 + 33.4 * Math.cos((a * Math.PI) / 180)}
                y2={36 + 33.4 * Math.sin((a * Math.PI) / 180)}
              />
            ))}
          </g>
        </>
      )}

      {/* pórtico */}
      <path
        d="M23 51 L23 32 Q23 17.5 36 12.5 Q49 17.5 49 32 L49 51"
        fill="none"
        stroke={cor}
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* cruz de luz, nascendo do livro */}
      <path d="M34.9 20 H37.1 V47 H34.9 Z" fill={`url(#${luz})`} />
      <path d="M28.4 28.2 H43.6 V30.1 H28.4 Z" fill={`url(#${luz})`} />

      {/* Escrituras abertas */}
      <g fill="none" stroke={cor} strokeWidth="1.5" strokeLinejoin="round">
        <path d="M36 48.6 C32 46.1 27.6 45.3 23.6 45.9 L23.6 52.6 C27.6 52 32 52.8 36 55.2 Z" />
        <path d="M36 48.6 C40 46.1 44.4 45.3 48.4 45.9 L48.4 52.6 C44.4 52 40 52.8 36 55.2 Z" />
      </g>
      <line x1="36" y1="48.6" x2="36" y2="55.2" stroke={cor} strokeWidth="1.1" opacity="0.55" />
    </svg>
  );
}
