/**
 * Gera as imagens fixas da marca com o Chrome headless:
 *
 *   public/marca/og.png        1200x630  — imagem de compartilhamento
 *   public/marca/icone-180.png  180x180  — ícone de tela de início (iOS)
 *   public/marca/icone-512.png  512x512  — ícone grande / PWA
 *
 * A arte é desenhada em SVG e capturada; não há imagem gerada por IA nem
 * mockup comprado. O que aparece no compartilhamento é o mesmo vitral do hero,
 * congelado — a peça e o site são a mesma coisa, não duas.
 *
 *   node scripts/gerar-arte.mjs
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const exec = promisify(execFile);
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DESTINO = join(RAIZ, 'public', 'marca');
const TEMP = join(RAIZ, '_arte-temp');

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);

if (!CHROME) {
  console.error('Nenhum Chrome/Edge encontrado.');
  process.exit(1);
}

mkdirSync(DESTINO, { recursive: true });
mkdirSync(TEMP, { recursive: true });

const OURO = '#C9A24A';
const OURO_LUZ = '#E9CE8B';

/** Rosácea em SVG: os mesmos 12 lóbulos e 24 raios da cena 3D. */
function rosacea(cx, cy, r) {
  const p = [];
  p.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${OURO}" stroke-width="2.4" opacity=".9"/>`);
  p.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.82}" fill="none" stroke="${OURO}" stroke-width="1" opacity=".5"/>`);

  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    p.push(
      `<line x1="${cx + Math.cos(a) * r * 0.36}" y1="${cy + Math.sin(a) * r * 0.36}" x2="${cx + Math.cos(a) * r * 0.82}" y2="${cy + Math.sin(a) * r * 0.82}" stroke="${OURO}" stroke-width="1" opacity=".45"/>`
    );
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    p.push(
      `<circle cx="${cx + Math.cos(a) * r * 0.59}" cy="${cy + Math.sin(a) * r * 0.59}" r="${r * 0.16}" fill="none" stroke="${OURO}" stroke-width="1.6" opacity=".8"/>`
    );
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    p.push(
      `<circle cx="${cx + Math.cos(a) * r * 0.24}" cy="${cy + Math.sin(a) * r * 0.24}" r="${r * 0.115}" fill="none" stroke="${OURO_LUZ}" stroke-width="1.4" opacity=".85"/>`
    );
  }
  p.push(`<circle cx="${cx}" cy="${cy}" r="${r * 0.355}" fill="none" stroke="${OURO_LUZ}" stroke-width="1.8" opacity=".9"/>`);
  return p.join('');
}

/** O selo "Pórtico da Luz", em escala. */
function selo(cx, cy, escala) {
  const t = (x, y) => `${cx + (x - 36) * escala},${cy + (y - 36) * escala}`;
  const e = (v) => v * escala;
  return `
    <g>
      <circle cx="${cx}" cy="${cy}" r="${e(34)}" fill="none" stroke="${OURO}" stroke-width="${e(1.5)}"/>
      <path d="M ${t(23, 51)} L ${t(23, 32)} Q ${t(23, 17.5)} ${t(36, 12.5)} Q ${t(49, 17.5)} ${t(49, 32)} L ${t(49, 51)}"
            fill="none" stroke="${OURO}" stroke-width="${e(1.6)}" stroke-linecap="round"/>
      <path d="M ${t(34.9, 20)} L ${t(37.1, 20)} L ${t(37.1, 47)} L ${t(34.9, 47)} Z" fill="${OURO_LUZ}"/>
      <path d="M ${t(28.4, 28.2)} L ${t(43.6, 28.2)} L ${t(43.6, 30.1)} L ${t(28.4, 30.1)} Z" fill="${OURO_LUZ}"/>
      <g fill="none" stroke="${OURO}" stroke-width="${e(1.5)}" stroke-linejoin="round">
        <path d="M ${t(36, 48.6)} C ${t(32, 46.1)} ${t(27.6, 45.3)} ${t(23.6, 45.9)} L ${t(23.6, 52.6)} C ${t(27.6, 52)} ${t(32, 52.8)} ${t(36, 55.2)} Z"/>
        <path d="M ${t(36, 48.6)} C ${t(40, 46.1)} ${t(44.4, 45.3)} ${t(48.4, 45.9)} L ${t(48.4, 52.6)} C ${t(44.4, 52)} ${t(40, 52.8)} ${t(36, 55.2)} Z"/>
      </g>
    </g>`;
}

const FUNDO = `
  <defs>
    <radialGradient id="miolo" cx="50%" cy="46%" r="52%">
      <stop offset="0%" stop-color="#3a2f16"/>
      <stop offset="45%" stop-color="#0d1220"/>
      <stop offset="100%" stop-color="#05070B"/>
    </radialGradient>
    <radialGradient id="halo" cx="50%" cy="46%" r="30%">
      <stop offset="0%" stop-color="#E9CE8B" stop-opacity=".34"/>
      <stop offset="100%" stop-color="#E9CE8B" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#05070B" stop-opacity="0"/>
      <stop offset="100%" stop-color="#05070B" stop-opacity=".94"/>
    </linearGradient>
    <radialGradient id="veu" cx="50%" cy="50%" r="42%">
      <stop offset="0%" stop-color="#05070B" stop-opacity=".93"/>
      <stop offset="60%" stop-color="#05070B" stop-opacity=".6"/>
      <stop offset="100%" stop-color="#05070B" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

/* ---------------------------------------------------------------- og */

const og = `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&family=Inter:wght@500;600&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;background:#05070B}
  .palco{position:relative;width:1200px;height:630px;overflow:hidden}
  svg{position:absolute;inset:0}
  .texto{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}
  h1{font-family:'Cormorant Garamond',serif;font-weight:600;font-size:92px;line-height:.95;color:#F4EEE2;margin:0;
     text-shadow:0 2px 10px rgba(5,7,11,.95),0 8px 50px rgba(5,7,11,.9)}
  h1 em{font-style:italic;font-weight:500;color:#E9CE8B}
  .sub{font-family:'Inter',sans-serif;font-size:19px;font-weight:600;letter-spacing:.42em;text-transform:uppercase;
       color:#98A1B2;margin-top:26px;padding-left:.42em}
  .autor{font-family:'Inter',sans-serif;font-size:16px;font-weight:600;letter-spacing:.3em;text-transform:uppercase;
         color:#C9A24A;margin-top:38px}
  .numeros{font-family:'Inter',sans-serif;font-size:15px;letter-spacing:.18em;text-transform:uppercase;color:#6F7A8C;margin-top:14px}
</style>
<div class="palco">
  <svg viewBox="0 0 1200 630">
    ${FUNDO}
    <rect width="1200" height="630" fill="url(#miolo)"/>
    <rect width="1200" height="630" fill="url(#halo)"/>
    ${rosacea(600, 300, 300)}
    <rect width="1200" height="630" fill="url(#veu)"/>
    <rect y="400" width="1200" height="230" fill="url(#base)"/>
    ${selo(600, 118, 0.92)}
  </svg>
  <div class="texto">
    <div style="height:150px"></div>
    <h1>Enciclopédia<br><em>Teológica</em></h1>
    <div class="sub">e Antropológica</div>
    <div class="autor">Eleno Gutemberg</div>
    <div class="numeros">97 estudos · 32 eixos · acervo aberto</div>
  </div>
</div>`;

/* -------------------------------------------------------------- ícone */

const icone = (lado) => `<!doctype html><meta charset="utf-8">
<style>html,body{margin:0}</style>
<svg width="${lado}" height="${lado}" viewBox="0 0 72 72" xmlns="http://www.w3.org/2000/svg">
  <rect width="72" height="72" rx="14" fill="#05070B"/>
  <circle cx="36" cy="36" r="30.5" fill="none" stroke="${OURO}" stroke-width=".6" opacity=".4"/>
  ${selo(36, 36, 0.86)}
</svg>`;

/* ------------------------------------------------------------ captura */

const pecas = [
  { nome: 'og.png', html: og, w: 1200, h: 630 },
  { nome: 'icone-180.png', html: icone(180), w: 180, h: 180 },
  { nome: 'icone-512.png', html: icone(512), w: 512, h: 512 },
];

for (const p of pecas) {
  const arquivo = join(TEMP, p.nome.replace('.png', '.html'));
  writeFileSync(arquivo, p.html, 'utf8');
  const destino = join(DESTINO, p.nome);
  try {
    await exec(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--hide-scrollbars',
        '--default-background-color=00000000',
        `--window-size=${p.w},${p.h}`,
        '--virtual-time-budget=4000',
        `--screenshot=${destino}`,
        'file:///' + arquivo.replace(/\\/g, '/'),
      ],
      { timeout: 60000 }
    );
  } catch {
    /* o Chrome sai com codigo != 0 mesmo gravando; o que vale e o arquivo */
  }
  console.log((existsSync(destino) ? 'ok    ' : 'FALHA ') + p.nome + `  ${p.w}x${p.h}`);
}

rmSync(TEMP, { recursive: true, force: true });
console.log('\narte em ' + DESTINO);
