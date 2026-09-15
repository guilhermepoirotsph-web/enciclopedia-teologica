import type { Estacao } from '../dados/configuracao';

/**
 * A rádio da enciclopédia.
 *
 * Três estações são GERADAS no navegador com Web Audio: nenhum arquivo para
 * hospedar, nenhuma faixa de terceiro, nenhum direito autoral para explicar
 * depois. A quarta estação ("externa") toca um endereço que o autor cadastra
 * no painel, para quando ele quiser a própria gravação.
 *
 * Regras que não se negociam:
 *  - NADA toca sozinho. O som só começa depois que o visitante clica. Além de
 *    ser o que os navegadores permitem, é o mínimo de respeito com quem abriu
 *    um site de estudo no meio do escritório.
 *  - Entrada e saída com fade. Cortar áudio seco dá um "clique" no alto-falante.
 *  - Quando a aba sai de foco, o som baixa — ninguém quer caçar a aba que está
 *    cantando.
 */

export type Radio = {
  tocar: () => Promise<boolean>;
  pausar: () => void;
  definirVolume: (v: number) => void;
  tocando: () => boolean;
  destruir: () => void;
};

export const ESTACOES: { id: Estacao; nome: string; descricao: string }[] = [
  { id: 'nave', nome: 'Nave', descricao: 'Bordão grave e notas longas, como o ar parado de uma igreja vazia.' },
  { id: 'vitral', nome: 'Vitral', descricao: 'Sinos esparsos sobre um fundo quente, para leitura longa.' },
  { id: 'salmo', nome: 'Salmo', descricao: 'Respiração lenta e profunda, quase só graves.' },
  { id: 'externa', nome: 'Gravação própria', descricao: 'Toca o endereço de áudio que você cadastrar.' },
  { id: 'nenhuma', nome: 'Sem trilha', descricao: 'O botão de som some do site.' },
];

/* Escala pentatônica maior em Lá — não existe intervalo dissonante dentro dela,
   então qualquer combinação de notas sorteadas soa bem. É o truque que permite
   improvisar para sempre sem vigiar harmonia. */
const PENTATONICA = [220.0, 246.94, 277.18, 329.63, 369.99, 440.0, 493.88, 554.37, 659.25];

type Receita = {
  /** frequência do bordão */
  bordao: number;
  /** segundos entre uma nota e outra */
  intervalo: [number, number];
  /** duração de cada nota */
  duracao: [number, number];
  /** corte do filtro passa-baixa */
  corte: number;
  /** de quais graus da escala as notas saem */
  faixa: [number, number];
  onda: OscillatorType;
};

const RECEITAS: Record<Exclude<Estacao, 'nenhuma' | 'externa'>, Receita> = {
  nave: { bordao: 110, intervalo: [3.5, 8], duracao: [5, 9], corte: 900, faixa: [0, 6], onda: 'sine' },
  vitral: { bordao: 164.81, intervalo: [2.5, 6], duracao: [3, 6], corte: 2200, faixa: [4, 9], onda: 'triangle' },
  salmo: { bordao: 82.41, intervalo: [6, 12], duracao: [8, 14], corte: 520, faixa: [0, 4], onda: 'sine' },
};

const entre = (a: number, b: number) => a + Math.random() * (b - a);

export function criarRadio(estacao: Estacao, opcoes: { volume: number; url?: string }): Radio | null {
  if (estacao === 'nenhuma') return null;
  if (estacao === 'externa') return radioExterna(opcoes.url ?? '', opcoes.volume);

  const receita = RECEITAS[estacao] ?? RECEITAS.nave;

  let ctx: AudioContext | null = null;
  let mestre: GainNode | null = null;
  let agendado: number | undefined;
  let vivo = false;
  let volume = opcoes.volume;

  const montar = () => {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();

    mestre = ctx.createGain();
    mestre.gain.value = 0;
    mestre.connect(ctx.destination);

    const filtro = ctx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = receita.corte;
    filtro.Q.value = 0.6;
    filtro.connect(mestre);

    // bordão: duas ondas levemente desafinadas, que é o que dá corpo ao som
    for (const desvio of [0, 0.6]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = receita.bordao + desvio;
      const g = ctx.createGain();
      g.gain.value = 0.16;
      osc.connect(g).connect(filtro);
      osc.start();
    }

    const nota = () => {
      if (!vivo || !ctx || ctx.state === 'closed') return;
      const [a, b] = receita.faixa;
      const f = PENTATONICA[Math.floor(entre(a, Math.min(b, PENTATONICA.length)))];
      const dur = entre(...receita.duracao);
      const agora = ctx.currentTime;

      const osc = ctx.createOscillator();
      osc.type = receita.onda;
      osc.frequency.value = f;

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, agora);
      g.gain.linearRampToValueAtTime(0.1, agora + dur * 0.35);
      g.gain.linearRampToValueAtTime(0, agora + dur);

      osc.connect(g).connect(filtro);
      osc.start(agora);
      osc.stop(agora + dur + 0.1);

      agendado = window.setTimeout(nota, entre(...receita.intervalo) * 1000);
    };

    vivo = true;
    nota();
  };

  const fade = (para: number, segundos = 1.6) => {
    if (!ctx || !mestre) return;
    const agora = ctx.currentTime;
    mestre.gain.cancelScheduledValues(agora);
    mestre.gain.setValueAtTime(mestre.gain.value, agora);
    mestre.gain.linearRampToValueAtTime(para, agora + segundos);
  };

  /* A aba escondida baixa o som em vez de continuar tocando alto — quem tem
     dez abas abertas não deve precisar caçar qual está fazendo barulho. */
  const aoVisibilidade = () => {
    if (!vivo) return;
    fade(document.hidden ? volume * 0.15 : volume, 0.8);
  };
  document.addEventListener('visibilitychange', aoVisibilidade);

  return {
    async tocar() {
      try {
        if (!ctx) montar();
        // Sem gesto do usuário o contexto nasce suspenso: isto é o desbloqueio.
        // O `resume()` em alguns navegadores NÃO rejeita quando não há gesto —
        // ele simplesmente fica pendurado para sempre. Sem este teto, o botão
        // ficaria travado em "carregando" e o visitante não saberia por quê.
        if (ctx!.state === 'suspended') {
          await Promise.race([ctx!.resume(), new Promise((r) => setTimeout(r, 2500))]);
        }
        if (ctx!.state !== 'running') return false;
        vivo = true;
        fade(volume);
        return true;
      } catch {
        return false;
      }
    },
    pausar() {
      fade(0, 0.9);
      window.setTimeout(() => {
        if (!ctx) return;
        vivo = false;
        clearTimeout(agendado);
      }, 950);
    },
    definirVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (vivo) fade(volume, 0.25);
    },
    tocando: () => vivo && (mestre?.gain.value ?? 0) > 0.001,
    destruir() {
      vivo = false;
      clearTimeout(agendado);
      document.removeEventListener('visibilitychange', aoVisibilidade);
      ctx?.close().catch(() => {});
      ctx = null;
      mestre = null;
    },
  };
}

/** Estação "externa": um endereço de áudio cadastrado pelo autor. */
function radioExterna(url: string, volume: number): Radio | null {
  if (!url.trim()) return null;

  const el = new Audio(url);
  el.loop = true;
  el.preload = 'none';
  el.volume = Math.max(0, Math.min(1, volume));
  // `crossOrigin` fica de fora de propósito: sem ele o arquivo toca mesmo que o
  // servidor de origem não mande cabeçalho de CORS. Não precisamos ler as
  // amostras, só reproduzir.

  let vivo = false;

  return {
    async tocar() {
      try {
        await el.play();
        vivo = true;
        return true;
      } catch {
        // endereço errado, servidor fora, ou formato que o navegador não abre
        return false;
      }
    },
    pausar() {
      el.pause();
      vivo = false;
    },
    definirVolume(v) {
      el.volume = Math.max(0, Math.min(1, v));
    },
    tocando: () => vivo && !el.paused,
    destruir() {
      el.pause();
      el.src = '';
      vivo = false;
    },
  };
}
