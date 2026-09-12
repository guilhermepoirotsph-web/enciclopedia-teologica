import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Link } from 'react-router-dom';
import Aparece from '../componentes/Aparece';
import { gerarPix } from '../dados/pix';
import { SITE } from '../dados/configuracao';

const VALORES = [10, 25, 50, 100];

export default function Apoie() {
  const [valor, setValor] = useState<number>(SITE.apoioSugerido);
  const [copiado, setCopiado] = useState(false);
  const tela = useRef<HTMLCanvasElement>(null);

  const pixLigado = Boolean(SITE.pix.chave && SITE.pix.nome);

  const codigo = useMemo(() => {
    if (!pixLigado) return '';
    return gerarPix({
      chave: SITE.pix.chave,
      nome: SITE.pix.nome,
      cidade: SITE.pix.cidade || 'BRASIL',
      valor,
      descricao: 'Apoio Enciclopedia',
    });
  }, [valor, pixLigado]);

  useEffect(() => {
    if (!codigo || !tela.current) return;
    QRCode.toCanvas(tela.current, codigo, {
      width: 232,
      margin: 1,
      color: { dark: '#05070B', light: '#F4EEE2' },
    }).catch(() => {});
  }, [codigo]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <>
      <header className="cabeca">
        <div className="miolo">
          <p className="rotulo">Sustentar o acervo</p>
          <h1>Apoie a obra</h1>
          <p className="olho">
            Os 97 estudos são abertos e continuam abertos. Não há paywall na biblioteca, não há
            anúncio na página e não há venda de dado de leitor. O que mantém isso de pé é o tempo de
            pesquisa do autor — e quem quiser, ajuda.
          </p>
        </div>
      </header>

      <section className="secao">
        <div className="miolo apoio">
          <Aparece className="apoio__pix">
            <h2 className="rodape__titulo">Contribuição por Pix</h2>

            {pixLigado ? (
              <>
                <div className="apoio__valores">
                  {VALORES.map((v) => (
                    <button
                      key={v}
                      className={`apoio__valor ${valor === v ? 'apoio__valor--ativo' : ''}`}
                      onClick={() => setValor(v)}
                    >
                      R$ {v},00
                    </button>
                  ))}
                </div>

                <div className="apoio__qr">
                  <canvas ref={tela} aria-label="QR Code do Pix" />
                </div>

                <div className="apoio__dados">
                  <p>
                    <span>Recebedor</span>
                    <strong>{SITE.pix.nome}</strong>
                  </p>
                  <p>
                    <span>Chave</span>
                    <strong className="mono">{SITE.pix.chave}</strong>
                  </p>
                  <p>
                    <span>Valor</span>
                    <strong>R$ {valor.toFixed(2).replace('.', ',')}</strong>
                  </p>
                </div>

                <button className="btn btn--ouro btn--bloco" onClick={copiar}>
                  {copiado ? 'Código copiado' : 'Copiar código Pix'}
                </button>

                <p className="apoio__nota">
                  O aplicativo do seu banco mostra o nome que o banco do recebedor publicou no
                  DICT — pode aparecer diferente do escrito aqui, e isso é normal: é a proteção do
                  sistema contra QR falso. Confira o nome antes de confirmar.
                </p>
              </>
            ) : (
              <div className="recado recado--aviso">
                <p style={{ margin: 0 }}>
                  <strong>Pix ainda não configurado.</strong> A chave do autor precisa ser cadastrada
                  no painel para que o QR e o copia-e-cola apareçam aqui. Enquanto isso, este bloco
                  não mostra dado nenhum — em vez de exibir uma chave inventada.
                </p>
              </div>
            )}
          </Aparece>

          <Aparece atraso={90}>
            <h2 className="secao__titulo">Outras formas de sustentar</h2>

            <div className="apoio__opcoes">
              <div className="apoio__opcao">
                <h3>Comprar o livro</h3>
                <p>
                  <em>Na Terra dos Viventes — Espírito, Alma</em> está publicado na Hotmart. É apoio e
                  leitura no mesmo gesto.
                </p>
                <a href={SITE.hotmart} target="_blank" rel="noopener noreferrer" className="btn btn--linha">
                  Ver o livro
                </a>
              </div>

              <div className="apoio__opcao">
                <h3>Entrar no Núcleo</h3>
                <p>
                  A assinatura do Núcleo sustenta a pesquisa e devolve material aprofundado a quem
                  assina.
                </p>
                <Link to="/nucleo" className="btn btn--linha">
                  Conhecer o Núcleo
                </Link>
              </div>

              <div className="apoio__opcao">
                <h3>Divulgar um estudo</h3>
                <p>
                  Custo zero e efeito real: mandar um artigo para o grupo da igreja alcança mais
                  gente do que qualquer anúncio pago.
                </p>
                <Link to="/biblioteca" className="btn btn--linha">
                  Escolher um estudo
                </Link>
              </div>
            </div>
          </Aparece>
        </div>
      </section>
    </>
  );
}
