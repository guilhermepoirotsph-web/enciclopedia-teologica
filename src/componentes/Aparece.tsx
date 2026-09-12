import { useEffect, useRef, type ElementType, type ReactNode } from 'react';

/**
 * Revelação por scroll.
 *
 * Regras aprendidas na marra:
 *  - UMA classe só (.aparece / .aparece--vista). Dois nomes parecidos já
 *    deixaram um site inteiro invisível no celular.
 *  - O que já está na dobra aparece na hora, sem esperar o observador.
 *  - Se o IntersectionObserver não existir ou nunca disparar, o elemento fica
 *    visível: nada aqui pode ser a razão de um texto sumir.
 *  - `?anim=0` na URL desliga tudo, para quando o próprio cliente quiser ver
 *    a página estática.
 */
export default function Aparece({
  children,
  atraso = 0,
  como: Como = 'div',
  className = '',
  ...resto
}: {
  children: ReactNode;
  atraso?: number;
  como?: ElementType;
  className?: string;
  [k: string]: unknown;
}) {
  const alvo = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = alvo.current;
    if (!el) return;

    const desligado = new URLSearchParams(location.search).get('anim') === '0';
    if (desligado || typeof IntersectionObserver === 'undefined') {
      el.classList.add('aparece--vista');
      return;
    }

    // Já visível no primeiro quadro? Mostra sem animar a entrada por scroll.
    if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
      const t = setTimeout(() => el.classList.add('aparece--vista'), atraso);
      return () => clearTimeout(t);
    }

    const obs = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (!e.isIntersecting) continue;
          setTimeout(() => el.classList.add('aparece--vista'), atraso);
          obs.unobserve(e.target);
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.08 }
    );
    obs.observe(el);

    // Rede: passados 4 segundos, nada continua escondido por causa de scroll.
    const rede = setTimeout(() => el.classList.add('aparece--vista'), 4000);

    return () => {
      obs.disconnect();
      clearTimeout(rede);
    };
  }, [atraso]);

  return (
    <Como ref={alvo} className={`aparece ${className}`} {...resto}>
      {children}
    </Como>
  );
}
