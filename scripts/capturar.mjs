/**
 * Captura as telas do site pelo Chrome headless.
 *
 * Por que não usar o navegador da sessão: aba em segundo plano tem o
 * requestAnimationFrame congelado pelo Chrome, então a animação nunca sai do
 * quadro zero e a captura mostra um site "quebrado" que na verdade está certo.
 * O headless com --virtual-time-budget avança o tempo de propósito e devolve
 * uma imagem fiel.
 *
 *   node scripts/capturar.mjs [porta] [rota,rota,...]
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const exec = promisify(execFile);
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SAIDA = join(RAIZ, '_capturas');

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(existsSync);

if (!CHROME) {
  console.error('Nenhum Chrome/Edge encontrado.');
  process.exit(1);
}

const porta = process.argv[2] || '5178';
const tela = process.argv[4] || '1440,900';
const rotas = (process.argv[3] || '/,/biblioteca,/artigo/fe,/eixos,/nucleo,/livro,/autor,/apoie,/contato,/entrar,/direitos').split(',');

mkdirSync(SAIDA, { recursive: true });

for (const rota of rotas) {
  const nome = (rota.replace(/^\//, '').replace(/\//g, '-') || 'inicio') + '.png';
  const destino = join(SAIDA, nome);
  const url = `http://127.0.0.1:${porta}${rota}`;

  try {
    await exec(
      CHROME,
      [
        '--headless=new',
        '--disable-gpu',
        '--use-gl=swiftshader',
        '--enable-unsafe-swiftshader',
        '--hide-scrollbars',
        '--window-size=' + tela,
        '--virtual-time-budget=7000',
        '--run-all-compositor-stages-before-draw',
        `--screenshot=${destino}`,
        url,
      ],
      { timeout: 90000 }
    );
    console.log('ok   ' + nome);
  } catch (e) {
    // O Chrome headless devolve código != 0 mesmo quando grava a imagem;
    // o que vale é o arquivo ter aparecido no disco.
    console.log((existsSync(destino) ? 'ok   ' : 'FALHA ') + nome + (existsSync(destino) ? '' : ' — ' + String(e.message).slice(0, 120)));
  }
}

console.log('\ncapturas em ' + SAIDA);
