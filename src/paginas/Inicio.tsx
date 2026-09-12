import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Selo from '../marca/Selo';
import Aparece from '../componentes/Aparece';
import CardArtigo from '../componentes/CardArtigo';
import { montarRosacea, type Rosacea } from '../cena/rosacea';
import { listarArtigos, listarEixos } from '../dados/fonte';
import { SITE } from '../dados/configuracao';
import type { Artigo, Eixo } from '../dados/tipos';

gsap.registerPlugin(ScrollTrigger);

export default function Inicio() {
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [eixos, setEixos] = useState<Eixo[]>([]);

  useEffect(() => {
    listarArtigos().then(setArtigos).catch(() => {});
    listarEixos().then(setEixos).catch(() => {});
  }, []);

  const numeros = useMemo(() => {
    if (!artigos.length) return SITE.acervo;
    const palavras = artigos.reduce((s, a) => s + a.palavras, 0);
    const datas = artigos.map((a) => a.criado || a.atualizado || '').filter(Boolean).sort();
    return { artigos: artigos.length, eixos: eixos.length || SITE.acervo.eixos, palavras, desde: datas[0]?.slice(0, 10) ?? SITE.acervo.desde };
  }, [artigos, eixos]);

  const destaques = artigos.slice(0, 6);

  return (
    <>
      <Hero total={numeros.artigos} />
      <Manifesto />
      <Numeros n={numeros} />
      <EixosEmDestaque eixos={eixos} />
      <Destaques artigos={destaques} />
      <OAutor />
      <OLivro />
      <ChamadaNucleo />
      <Esclarecimento />
    </>
  );
}

/* ------------------------------------------------------------------ hero */

function Hero({ total }: { total: number }) {
  const secao = useRef<HTMLElement>(null);
  const palco = useRef<HTMLDivElement>(null);
  const [semWebgl, setSemWebgl] = useState(false);

  useEffect(() => {
    const host = palco.current;
    const sec = secao.current;
    if (!host || !sec) return;

    const desligado = new URLSearchParams(location.search).get('anim') === '0';
    let cena: Rosacea | null = null;

    if (!desligado) {
      cena = montarRosacea(host);
      if (!cena) setSemWebgl(true);
    } else {
      setSemWebgl(true);
    }

    const ctx = gsap.context(() => {
      if (desligado) {
        gsap.set('.hero__revela', { opacity: 1, y: 0 });
      } else {
        gsap.fromTo(
          '.hero__revela',
          // fromTo com destino explícito: o gsap.from() grava como valor final o
          // que encontrar na hora em que é criado e já deixou elemento preso em
          // opacity 0 para sempre quando recriado sobre um alvo transparente.
          { opacity: 0, y: 28 },
          { opacity: 1, y: 0, duration: 1.1, stagger: 0.12, delay: 0.25, ease: 'power3.out' }
        );
      }

      if (cena && !desligado) {
        ScrollTrigger.create({
          trigger: sec,
          start: 'top top',
          end: '+=110%',
          pin: true,
          pinSpacing: true,
          scrub: 0.6,
          onUpdate: (s) => {
            cena!.setProgresso(s.progress);
            gsap.set('.hero__conteudo', { opacity: 1 - s.progress * 1.35, y: -s.progress * 60 });
          },
        });
      }
    }, sec);

    /* Rede contra hero invisível.
       A entrada do hero é animada pelo GSAP, que depende de requestAnimationFrame.
       Quando o navegador estrangula o rAF — aba aberta em segundo plano, janela
       minimizada, economia de bateria — a animação fica parada no quadro zero e o
       título simplesmente não aparece. O sintoma é exatamente o mesmo de um site
       quebrado, e quem olha não tem como saber a diferença.
       Passados 2 segundos, se o hero ainda estiver apagado, ele é mostrado na
       marra. Texto invisível nunca é uma opção aceitável. */
    const rede = setTimeout(() => {
      sec.querySelectorAll<HTMLElement>('.hero__revela').forEach((el) => {
        if (Number(getComputedStyle(el).opacity) < 0.9) {
          el.style.opacity = '1';
          el.style.transform = 'none';
        }
      });
    }, 2000);

    return () => {
      clearTimeout(rede);
      ctx.revert();
      cena?.destruir();
    };
  }, []);

  return (
    <section className="hero" ref={secao}>
      <div className="hero__palco" ref={palco} aria-hidden="true" />
      {semWebgl && <div className="hero__vitral-css" aria-hidden="true" />}

      {/* Véu entre o vitral e o texto. Sem ele o ouro da rosácea passa por trás
          das letras e o título some — o efeito mais caro da página acabaria
          tornando ilegível justamente o nome do site. */}
      <div className="hero__veu" aria-hidden="true" />
      <div className="hero__veu-base" aria-hidden="true" />

      <div className="hero__conteudo miolo">
        <div className="hero__selo hero__revela">
          <Selo tamanho={92} />
        </div>

        <p className="rotulo hero__revela">{SITE.subtitulo}</p>

        <h1 className="hero__titulo hero__revela">
          Enciclopédia
          <em>Teológica</em>
          <span>e Antropológica</span>
        </h1>

        <p className="hero__claim hero__revela">
          {total} estudos sobre Bíblia, doutrina, história e sociedade — escritos, revisados e
          organizados por <strong>Eleno Gutemberg</strong> para quem não se contenta com a resposta
          de superfície.
        </p>

        <div className="hero__acoes hero__revela">
          <Link to="/biblioteca" className="btn btn--ouro">
            Entrar na biblioteca
          </Link>
          <Link to="/livro" className="btn btn--linha">
            Conhecer o livro
          </Link>
        </div>

        <p className="hero__nota hero__revela">
          Acervo aberto · sem login para ler · revisão periódica
        </p>
      </div>

      <div className="hero__desce" aria-hidden="true">
        <span />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- manifesto */

function Manifesto() {
  return (
    <section className="secao">
      <div className="miolo manifesto">
        <Aparece como="p" className="rotulo">
          O que é este lugar
        </Aparece>

        <Aparece como="h2" className="manifesto__titulo" atraso={80}>
          O conhecimento é dinâmico. A verdade das Escrituras não é — mas o nosso entendimento dela
          precisa ser trabalhado.
        </Aparece>

        <Aparece className="manifesto__corpo" atraso={160}>
          <p>
            Este espaço é dedicado ao registro e ao compartilhamento de pesquisas sobre o contexto
            bíblico, à análise das doutrinas cristãs e a artigos sobre sociedade e fé. O objetivo é
            organizar o conhecimento para auxílio de estudantes da Bíblia e de qualquer pessoa
            interessada na verdade das Escrituras.
          </p>
          <p>
            Os artigos passam por revisões periódicas para garantir atualidade e precisão. Entendemos
            que o conhecimento é dinâmico — por isso estamos sempre abertos a correções e ao debate
            construtivo sobre os temas abordados.
          </p>
        </Aparece>

        <Aparece className="manifesto__pilares" atraso={220}>
          {[
            ['Texto antes de opinião', 'Toda afirmação é ancorada em passagem citada, no contexto em que foi escrita.'],
            ['História junto com doutrina', 'Arqueologia, etnologia e cronologia entram para sustentar o relato, não para decorá-lo.'],
            ['Debate, não trincheira', 'Posições são apresentadas com fundamento e permanecem abertas a correção.'],
          ].map(([t, d]) => (
            <div key={t} className="pilar">
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </Aparece>
      </div>
    </section>
  );
}

/* --------------------------------------------------------------- números */

function Numero({ valor, sufixo = '' }: { valor: number; sufixo?: string }) {
  const [v, setV] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obj = { n: 0 };
    const tween = gsap.to(obj, {
      n: valor,
      duration: 1.6,
      ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
      onUpdate: () => setV(Math.round(obj.n)),
      onComplete: () => setV(valor),
    });
    // Rede: se o ScrollTrigger não disparar, o número certo aparece assim mesmo.
    const t = setTimeout(() => setV((atual) => (atual === 0 ? valor : atual)), 2500);
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      clearTimeout(t);
    };
  }, [valor]);

  return (
    <span ref={ref} className="mono">
      {v.toLocaleString('pt-BR')}
      {sufixo}
    </span>
  );
}

function Numeros({ n }: { n: { artigos: number; eixos: number; palavras: number; desde: string } }) {
  const desde = n.desde ? new Date(n.desde).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) : '';

  return (
    <section className="secao secao--pedra">
      <div className="miolo">
        <div className="numeros">
          <div className="numeros__item">
            <strong><Numero valor={n.artigos} /></strong>
            <span>estudos publicados</span>
          </div>
          <div className="numeros__item">
            <strong><Numero valor={n.eixos} /></strong>
            <span>eixos temáticos</span>
          </div>
          <div className="numeros__item">
            <strong><Numero valor={Math.round(n.palavras / 1000)} sufixo=" mil" /></strong>
            <span>palavras de pesquisa</span>
          </div>
          <div className="numeros__item">
            <strong style={{ fontSize: 'clamp(1.5rem,3vw,2.2rem)' }}>{desde}</strong>
            <span>primeiro artigo do acervo</span>
          </div>
        </div>
        <p className="numeros__nota">
          Números contados do acervo real no momento em que esta página carregou — nada aqui é
          arredondado para cima.
        </p>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- eixos */

function EixosEmDestaque({ eixos }: { eixos: Eixo[] }) {
  if (!eixos.length) return null;

  return (
    <section className="secao">
      <div className="miolo">
        <Aparece className="filete">
          <span className="rotulo">Por onde começar</span>
        </Aparece>

        <Aparece como="h2" className="secao__titulo">
          Trinta e dois eixos, um método só
        </Aparece>

        <Aparece como="p" className="olho" atraso={80}>
          O acervo não é uma pilha de textos avulsos. Cada estudo entra num eixo, e cada eixo
          responde a uma pergunta que alguém já levou para o culto de quarta-feira.
        </Aparece>

        <div className="grade grade--3" style={{ marginTop: '2.6rem' }}>
          {eixos.slice(0, 9).map((e, i) => (
            <Aparece key={e.slug} atraso={i * 55}>
              <Link to={`/eixo/${e.slug}`} className="cartao cartao--eixo">
                <span className="cartao__conta mono">{String(e.total).padStart(2, '0')}</span>
                <h3 className="cartao__titulo">{e.nome}</h3>
                <p className="cartao__resumo">{e.descricao}</p>
                <span className="cartao__seta" aria-hidden="true">→</span>
              </Link>
            </Aparece>
          ))}
        </div>

        <div className="centro" style={{ marginTop: '2.4rem' }}>
          <Link to="/eixos" className="btn btn--linha">
            Ver os {eixos.length} eixos
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- destaques */

function Destaques({ artigos }: { artigos: Artigo[] }) {
  if (!artigos.length) return null;

  return (
    <section className="secao secao--pedra">
      <div className="miolo">
        <Aparece className="filete">
          <span className="rotulo">Revisados por último</span>
        </Aparece>

        <Aparece como="h2" className="secao__titulo">
          O que saiu da bancada agora
        </Aparece>

        <div className="grade grade--3" style={{ marginTop: '2.6rem' }}>
          {artigos.map((a, i) => (
            <Aparece key={a.slug} atraso={i * 55}>
              <CardArtigo a={a} />
            </Aparece>
          ))}
        </div>

        <div className="centro" style={{ marginTop: '2.4rem' }}>
          <Link to="/biblioteca" className="btn btn--ouro">
            Abrir a biblioteca inteira
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- autor */

function OAutor() {
  return (
    <section className="secao">
      <div className="miolo autor">
        <Aparece className="autor__retrato">
          <div className="autor__moldura">
            <Selo tamanho={140} />
          </div>
        </Aparece>

        <div>
          <Aparece className="filete">
            <span className="rotulo">Quem escreve</span>
          </Aparece>
          <Aparece como="h2" className="secao__titulo">
            Eleno Gutemberg
          </Aparece>
          <Aparece como="div" className="olho" atraso={90}>
            <p>
              Pesquisador e escritor. Escreve sobre teologia bíblica, história antiga e o encontro
              entre fé e sociedade — e escreve há tempo suficiente para voltar atrás e corrigir o
              próprio texto quando a pesquisa pede.
            </p>
            <p>
              É autor de <em>Na Terra dos Viventes — Espírito, Alma</em> e mantém este acervo aberto
              desde abril de 2026, com revisão contínua de cada estudo publicado.
            </p>
          </Aparece>
          <Aparece className="linha" atraso={140} style={{ marginTop: '1.8rem' }}>
            <Link to="/autor" className="btn btn--linha">
              Conhecer o autor
            </Link>
            <Link to="/contato" className="btn btn--linha">
              Falar com ele
            </Link>
          </Aparece>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------------- livro */

function OLivro() {
  return (
    <section className="secao livro-faixa">
      <div className="miolo livro-faixa__grade">
        <Aparece className="livro-faixa__capa">
          <div className="capa-livro">
            <span className="capa-livro__selo">
              <Selo tamanho={38} variante="compacto" />
            </span>
            <span className="capa-livro__titulo">
              Na Terra
              <br />
              dos Viventes
            </span>
            <span className="capa-livro__sub">Espírito, Alma</span>
            <span className="capa-livro__autor">Eleno Gutemberg</span>
          </div>
        </Aparece>

        <div>
          <Aparece className="filete">
            <span className="rotulo">Obra publicada</span>
          </Aparece>
          <Aparece como="h2" className="secao__titulo">
            O que morre, o que permanece e onde o ser humano de fato habita
          </Aparece>
          <Aparece como="p" className="olho" atraso={90}>
            O livro em que o autor destrincha a constituição do ser — espírito, alma e corpo — e
            enfrenta a pergunta que quase toda igreja adia: o que exatamente atravessa a morte.
          </Aparece>
          <Aparece className="linha" atraso={150} style={{ marginTop: '1.8rem' }}>
            <a href={SITE.hotmart} target="_blank" rel="noopener noreferrer" className="btn btn--ouro">
              Comprar na Hotmart
            </a>
            <Link to="/livro" className="btn btn--linha">
              Ler o resumo
            </Link>
          </Aparece>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- núcleo */

function ChamadaNucleo() {
  return (
    <section className="secao secao--pedra">
      <div className="miolo nucleo-chamada">
        <Aparece className="filete">
          <span className="rotulo">Núcleo de Estudos</span>
        </Aparece>

        <Aparece como="h2" className="secao__titulo" style={{ maxWidth: '20ch' }}>
          A biblioteca continua aberta. O aprofundamento é que tem porta.
        </Aparece>

        <Aparece como="p" className="olho" atraso={90}>
          Os 97 artigos permanecem livres, sem login e sem cobrança — essa é a linha editorial e ela
          não muda. O Núcleo é o passo seguinte para quem estuda a sério: séries organizadas em
          ordem de leitura, material de apoio e acesso direto ao autor.
        </Aparece>

        <Aparece className="linha" atraso={150} style={{ marginTop: '2rem' }}>
          <Link to="/nucleo" className="btn btn--ouro">
            Ver o que tem no Núcleo
          </Link>
          <Link to="/apoie" className="btn btn--linha">
            Ou apoiar com R$ {SITE.apoioSugerido},00
          </Link>
        </Aparece>
      </div>
    </section>
  );
}

/* -------------------------------------------------------- esclarecimento */

function Esclarecimento() {
  return (
    <section className="secao esclarecimento-faixa">
      <div className="miolo">
        <Aparece className="esclarecimento">
          <h2 className="esclarecimento__titulo">Nota de esclarecimento</h2>
          <p>
            Estes artigos não têm o intuito de ofender indivíduos, suas convicções ou orientações
            pessoais. O objetivo é, respeitosamente, apresentar um posicionamento fundamentado nas
            Escrituras Sagradas, reconhecendo que vivemos em um Estado laico e democrático, onde a
            liberdade de expressão, de crença e de comportamento é direito fundamental de todos.
          </p>
          <Link to="/esclarecimento" className="esclarecimento__link">
            Ler a nota completa e o amparo legal →
          </Link>
        </Aparece>
      </div>
    </section>
  );
}
