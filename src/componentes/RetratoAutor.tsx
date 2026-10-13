/** Retrato do autor no círculo da moldura (enviado pelo Guilherme em 13/10/2026). */
export default function RetratoAutor() {
  return (
    <picture>
      <source srcSet="/marca/eleno-retrato.webp" type="image/webp" />
      <img
        className="autor__foto"
        src="/marca/eleno-retrato.jpg"
        alt="Eleno Gutemberg Silva, de óculos, blazer escuro e camisa cinza"
        width={640}
        height={640}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
}
