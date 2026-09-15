import { useEffect, useRef, useState } from 'react';
import { lerConfigLocal, salvarConfig } from '../../dados/painel';
import { SITE } from '../../dados/configuracao';
import { crcConferido, gerarPix } from '../../dados/pix';
import { criarRadio, ESTACOES, type Radio } from '../../audio/radio';
import type { Estacao } from '../../dados/configuracao';

/**
 * Cada campo aqui tem um consumidor no site. Configuração pela metade — chave
 * no banco sem campo no painel, ou campo que o site não lê — é o defeito que
 * mais se repete, então a coluna "onde aparece" existe para tornar isso óbvio.
 */
const CAMPOS = [
  { chave: 'whatsapp', rotulo: 'WhatsApp (só números, com 55)', dica: 'Ex.: 5512988887777', onde: 'Botão verde no Contato e no rodapé', valor: SITE.whatsapp },
  { chave: 'email', rotulo: 'E-mail de contato', dica: '', onde: 'Botão no Contato', valor: SITE.email },
  { chave: 'instagram', rotulo: 'Instagram (link completo)', dica: '', onde: 'Rodapé', valor: SITE.instagram },
  { chave: 'youtube', rotulo: 'YouTube (link completo)', dica: '', onde: 'Rodapé', valor: SITE.youtube },
  { chave: 'hotmart', rotulo: 'Link do livro na Hotmart', dica: '', onde: 'Página do livro e home', valor: SITE.hotmart },
  { chave: 'pix_chave', rotulo: 'Chave Pix', dica: 'CPF, e-mail, telefone ou chave aleatória', onde: 'QR e copia-e-cola em Apoie', valor: SITE.pix.chave },
  { chave: 'pix_nome', rotulo: 'Nome do recebedor do Pix', dica: 'Como está no banco', onde: 'Apoie', valor: SITE.pix.nome },
  { chave: 'pix_cidade', rotulo: 'Cidade do recebedor', dica: '', onde: 'Apoie', valor: SITE.pix.cidade },
  { chave: 'infinitepay', rotulo: 'InfiniteTag (cartão pela InfinitePay)', dica: 'Só o apelido, sem o endereço', onde: 'Checkout do Núcleo', valor: SITE.infinitepay },
] as const;

export default function Config() {
  const [valores, setValores] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    const local = lerConfigLocal();
    const base: Record<string, string> = {};
    CAMPOS.forEach((c) => (base[c.chave] = local[c.chave] ?? c.valor ?? ''));
    // A trilha nao esta em CAMPOS (nao e campo de texto simples), entao precisa
    // ser semeada aqui — senao o painel abriria sempre no padrao, ignorando o
    // que o autor ja tinha escolhido.
    base.radio_estacao = local.radio_estacao ?? SITE.radio.estacao;
    base.radio_volume = local.radio_volume ?? String(SITE.radio.volume);
    base.radio_mostrar = local.radio_mostrar ?? (SITE.radio.mostrar ? 'sim' : 'nao');
    base.radio_url = local.radio_url ?? SITE.radio.url;
    setValores(base);
  }, []);

  async function guardar(chave: string, valor: string) {
    const r = await salvarConfig(chave, valor);
    setAviso(r.ok ? (r.previa ? 'Guardado no rascunho local (modo prévia).' : 'Salvo.') : `Não salvou: ${r.erro}`);
    setTimeout(() => setAviso(''), 3500);
  }

  const pixPronto = Boolean(valores.pix_chave && valores.pix_nome);
  const amostraPix = pixPronto
    ? gerarPix({ chave: valores.pix_chave, nome: valores.pix_nome, cidade: valores.pix_cidade || 'BRASIL', valor: 10, descricao: 'Apoio Enciclopedia' })
    : '';

  return (
    <>
      <header className="painel__cabeca">
        <div>
          <p className="rotulo">Ajustes</p>
          <h1>Configurações</h1>
        </div>
      </header>

      {aviso && <p className="recado recado--ok" style={{ marginBottom: '1.2rem' }}>{aviso}</p>}

      <p className="recado recado--aviso" style={{ marginBottom: '1.8rem' }}>
        Campo em branco <strong>esconde</strong> o botão correspondente no site, em vez de deixar um
        link morto. Preencher é o que faz o botão nascer.
      </p>

      <div className="config">
        {CAMPOS.map((c) => (
          <div key={c.chave} className="config__linha">
            <label className="campo" style={{ margin: 0 }}>
              <span>{c.rotulo}</span>
              <input
                value={valores[c.chave] ?? ''}
                onChange={(e) => setValores({ ...valores, [c.chave]: e.target.value })}
                onBlur={(e) => guardar(c.chave, e.target.value)}
                placeholder={c.dica}
              />
            </label>
            <p className="config__onde">
              <span className="rotulo">onde aparece</span>
              {c.onde}
              {!valores[c.chave] && <em className="config__vazio"> — vazio: escondido no site</em>}
            </p>
          </div>
        ))}
      </div>

      <TrilhaSonora valores={valores} setValores={setValores} guardar={guardar} />

      <section style={{ marginTop: '2.4rem' }}>
        <h2 className="rodape__titulo">Conferência do Pix</h2>
        <p className="fosco" style={{ fontSize: '0.86rem' }}>
          Algoritmo do código: <strong>{crcConferido() ? 'conferido com o vetor da norma (29B1)' : 'FALHOU na conferência'}</strong>.
        </p>
        {pixPronto ? (
          <>
            <p className="fosco" style={{ fontSize: '0.86rem' }}>
              Amostra do copia-e-cola de R$ 10,00 com os dados acima:
            </p>
            <code className="config__amostra">{amostraPix}</code>
            <p className="fosco" style={{ fontSize: '0.8rem', marginTop: '0.8rem' }}>
              Antes de divulgar, teste pagando R$ 1,00 para você mesmo — é o único jeito de provar
              que caiu na conta certa.
            </p>
          </>
        ) : (
          <p className="fosco" style={{ fontSize: '0.86rem' }}>
            Preencha chave e nome do recebedor para ver a amostra do código.
          </p>
        )}
      </section>
    </>
  );
}

/* ------------------------------------------------------- trilha sonora */

/**
 * "A rádio" da enciclopédia: o autor escolhe a estação, o volume inicial e se
 * o botão aparece para o visitante.
 *
 * O botão OUVIR existe por um motivo prático: ninguém escolhe trilha sonora
 * lendo o nome dela. Ele toca aqui mesmo, antes de salvar — e usa exatamente o
 * mesmo gerador que o site usa, não uma amostra parecida.
 */
function TrilhaSonora({
  valores,
  setValores,
  guardar,
}: {
  valores: Record<string, string>;
  setValores: (v: Record<string, string>) => void;
  guardar: (chave: string, valor: string) => void;
}) {
  const [tocando, setTocando] = useState(false);
  const previa = useRef<Radio | null>(null);

  const estacao = (valores.radio_estacao || 'nave') as Estacao;
  const volume = Number(valores.radio_volume ?? '0.35');
  const mostrar = (valores.radio_mostrar ?? 'sim') !== 'nao';
  const url = valores.radio_url ?? '';

  // Trocar de estação com o som ligado tem que trocar o som, não empilhar.
  useEffect(() => {
    return () => {
      previa.current?.destruir();
      previa.current = null;
    };
  }, []);

  function trocar(chave: string, valor: string) {
    setValores({ ...valores, [chave]: valor });
    guardar(chave, valor);
    if (chave === 'radio_estacao' || chave === 'radio_url') pararPrevia();
  }

  function pararPrevia() {
    previa.current?.destruir();
    previa.current = null;
    setTocando(false);
  }

  async function ouvir() {
    if (tocando) {
      pararPrevia();
      return;
    }
    previa.current = criarRadio(estacao, { volume, url });
    if (!previa.current) return;
    const deu = await previa.current.tocar();
    setTocando(deu);
  }

  const ficha = ESTACOES.find((e) => e.id === estacao);

  return (
    <section style={{ marginTop: '2.4rem' }}>
      <h2 className="rodape__titulo">Trilha sonora do site</h2>

      <p className="recado recado--aviso" style={{ marginBottom: '1.4rem' }}>
        A trilha <strong>nunca começa sozinha</strong>. O visitante vê um botão discreto no canto e
        decide se quer som — é o que os navegadores permitem e é o mínimo de respeito com quem abriu
        o site no meio do trabalho.
      </p>

      <div className="config__linha">
        <label className="campo" style={{ margin: 0 }}>
          <span>Estação</span>
          <select value={estacao} onChange={(e) => trocar('radio_estacao', e.target.value)}>
            {ESTACOES.map((e) => (
              <option key={e.id} value={e.id}>
                {e.nome}
              </option>
            ))}
          </select>
        </label>
        <p className="config__onde">
          <span className="rotulo">o que é</span>
          {ficha?.descricao}
        </p>
      </div>

      {estacao === 'externa' && (
        <div className="config__linha">
          <label className="campo" style={{ margin: 0 }}>
            <span>Endereço do áudio (mp3 ou rádio)</span>
            <input
              value={url}
              onChange={(e) => setValores({ ...valores, radio_url: e.target.value })}
              onBlur={(e) => trocar('radio_url', e.target.value)}
              placeholder="https://…"
            />
          </label>
          <p className="config__onde">
            <span className="rotulo">atenção</span>
            Precisa ser um endereço que abra direto no navegador e comece com <code>https</code>.
            Link do YouTube não funciona aqui.
          </p>
        </div>
      )}

      {estacao !== 'nenhuma' && (
        <>
          <div className="config__linha">
            <label className="campo" style={{ margin: 0 }}>
              <span>Volume inicial — {Math.round(volume * 100)}%</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setValores({ ...valores, radio_volume: e.target.value })}
                onMouseUp={(e) => trocar('radio_volume', (e.target as HTMLInputElement).value)}
                onTouchEnd={(e) => trocar('radio_volume', (e.target as HTMLInputElement).value)}
                style={{ accentColor: 'var(--ouro)' }}
              />
            </label>
            <p className="config__onde">
              <span className="rotulo">onde aparece</span>
              Volume em que a trilha começa. O visitante pode mudar depois.
            </p>
          </div>

          <div className="config__linha">
            <label className="linha" style={{ gap: '0.6rem', cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox"
                checked={mostrar}
                onChange={(e) => trocar('radio_mostrar', e.target.checked ? 'sim' : 'nao')}
                style={{ width: 18, height: 18 }}
              />
              <span>Mostrar o botão de som no site</span>
            </label>
            <p className="config__onde">
              <span className="rotulo">se desmarcar</span>
              O botão some e ninguém ouve nada — igual a escolher "Sem trilha".
            </p>
          </div>

          <button className="btn btn--linha" onClick={ouvir} style={{ marginTop: '0.6rem' }}>
            {tocando ? '■ Parar' : '▶ Ouvir esta estação'}
          </button>
          {tocando && (
            <p className="fosco" style={{ fontSize: '0.8rem', marginTop: '0.6rem' }}>
              Tocando aqui no painel. É exatamente o que o visitante vai ouvir.
            </p>
          )}
        </>
      )}
    </section>
  );
}
