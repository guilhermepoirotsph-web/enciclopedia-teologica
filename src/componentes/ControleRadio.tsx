import { useEffect, useRef, useState } from 'react';
import { criarRadio, ESTACOES, type Radio } from '../audio/radio';
import { SITE } from '../dados/configuracao';

const CHAVE = 'eta.radio';

/**
 * Controle da trilha sonora, para o visitante.
 *
 * Fica discreto no canto e NÃO toca nada sozinho — o som só começa quando a
 * pessoa clica. O estado fica guardado no navegador dela, então ao voltar o
 * botão já aparece do jeito que ela deixou; mas ligar é sempre decisão dela,
 * a cada visita.
 *
 * A estação e o volume inicial são escolha do AUTOR, no painel. Se ele
 * escolher "Sem trilha", este controle simplesmente não existe.
 */
export default function ControleRadio() {
  const { estacao, mostrar, volume: volumePadrao, url } = SITE.radio;

  const [ligado, setLigado] = useState(false);
  const [volume, setVolume] = useState(volumePadrao);
  const [aberto, setAberto] = useState(false);
  const [falhou, setFalhou] = useState(false);
  const radio = useRef<Radio | null>(null);

  const ativo = mostrar && estacao !== 'nenhuma' && (estacao !== 'externa' || Boolean(url));

  useEffect(() => {
    if (!ativo) return;
    try {
      const guardado = JSON.parse(localStorage.getItem(CHAVE) || '{}');
      if (typeof guardado.volume === 'number') setVolume(guardado.volume);
    } catch {
      /* localStorage bloqueado: usa o padrão do autor */
    }
    return () => {
      radio.current?.destruir();
      radio.current = null;
    };
  }, [ativo]);

  if (!ativo) return null;

  const nome = ESTACOES.find((e) => e.id === estacao)?.nome ?? 'Trilha';

  const guardar = (v: number) => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ volume: v }));
    } catch {
      /* idem */
    }
  };

  async function alternar() {
    setFalhou(false);
    if (!radio.current) radio.current = criarRadio(estacao, { volume, url });
    if (!radio.current) {
      setFalhou(true);
      return;
    }
    if (ligado) {
      radio.current.pausar();
      setLigado(false);
      return;
    }
    const deu = await radio.current.tocar();
    setLigado(deu);
    if (!deu) setFalhou(true);
  }

  function mudarVolume(v: number) {
    setVolume(v);
    guardar(v);
    radio.current?.definirVolume(v);
  }

  return (
    <div className={`radio nao-imprime ${aberto ? 'radio--aberto' : ''}`}>
      {aberto && (
        <div className="radio__painel">
          <p className="radio__nome">{nome}</p>
          <label className="radio__volume">
            <span className="desloca">Volume</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(e) => mudarVolume(Number(e.target.value))}
            />
          </label>
          {falhou && <p className="radio__erro">Não consegui tocar essa trilha aqui.</p>}
        </div>
      )}

      <div className="radio__botoes">
        <button
          className={`radio__som ${ligado ? 'radio__som--ligado' : ''}`}
          onClick={alternar}
          aria-pressed={ligado}
          aria-label={ligado ? `Desligar a trilha ${nome}` : `Ligar a trilha ${nome}`}
          title={ligado ? 'Desligar a trilha' : `Ligar a trilha ${nome}`}
        >
          <Onda ligado={ligado} />
        </button>
        <button
          className="radio__abrir"
          onClick={() => setAberto((v) => !v)}
          aria-expanded={aberto}
          aria-label={aberto ? 'Fechar o controle da trilha' : 'Ajustar a trilha'}
        >
          {aberto ? '×' : '⋯'}
        </button>
      </div>
    </div>
  );
}

/** Ícone: três barrinhas que só se mexem quando o som está ligado. */
function Onda({ ligado }: { ligado: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <g fill="currentColor" className={ligado ? 'onda onda--viva' : 'onda'}>
        <rect x="4" y="9" width="3" height="6" rx="1.5" />
        <rect x="10.5" y="6" width="3" height="12" rx="1.5" />
        <rect x="17" y="10" width="3" height="4" rx="1.5" />
      </g>
    </svg>
  );
}
