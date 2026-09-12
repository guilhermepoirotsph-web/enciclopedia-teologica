/**
 * Servidor da prévia: serve dist-previa/ atrás de senha, sem deixar rastro.
 *
 * Três cuidados que não são decoração:
 *  - `noindex` em todas as respostas, para o Google não indexar um endereço
 *    temporário que amanhã não existe mais;
 *  - senha conferida com timingSafeEqual (comparação de string vaza tempo);
 *  - só arquivos de web saem daqui: nada de .mjs, .ps1, .md, .sql ou pontinho
 *    escondido, mesmo que alguém adivinhe o caminho.
 *
 *   node scripts/previa-servidor.mjs [porta] [usuario] [senha]
 */
import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname, normalize } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PASTA = join(RAIZ, 'dist-previa');

const PORTA = Number(process.argv[2]) || 8803;
const USUARIO = process.argv[3] || 'eleno';
const SENHA = process.argv[4] || 'portico2026';

if (!existsSync(join(PASTA, 'index.html'))) {
  console.error('dist-previa/ não existe. Rode antes: node scripts/previa-montar.mjs');
  process.exit(1);
}

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

/** Comparação de senha em tempo constante. */
function confere(recebido, esperado) {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) {
    // compara mesmo assim, contra um alvo do tamanho certo, para não vazar o
    // tamanho da senha pelo tempo de resposta
    timingSafeEqual(b, b);
    return false;
  }
  return timingSafeEqual(a, b);
}

function autorizado(req) {
  const cab = req.headers.authorization || '';
  if (!cab.startsWith('Basic ')) return false;
  const [u, ...resto] = Buffer.from(cab.slice(6), 'base64').toString('utf8').split(':');
  const s = resto.join(':');
  return confere(u, USUARIO) && confere(s, SENHA);
}

const servidor = http.createServer((req, res) => {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (!autorizado(req)) {
    res.writeHead(401, {
      'WWW-Authenticate': 'Basic realm="Previa - Enciclopedia Teologica", charset="UTF-8"',
      'content-type': 'text/html; charset=utf-8',
    });
    res.end('<h1>Prévia protegida</h1><p>Use o usuário e a senha que vieram no convite.</p>');
    return;
  }

  const caminho = decodeURIComponent((req.url || '/').split('?')[0]);
  let alvo = normalize(join(PASTA, caminho));

  // nada fora da pasta da prévia
  if (!alvo.startsWith(PASTA)) {
    res.writeHead(403).end('nao');
    return;
  }

  if (existsSync(alvo) && statSync(alvo).isDirectory()) alvo = join(alvo, 'index.html');

  const ext = extname(alvo).toLowerCase();
  const ehArquivoDeWeb = TIPOS[ext] !== undefined;

  // rota de SPA: /biblioteca, /artigo/fe, /painel… caem no index.html
  if (!existsSync(alvo) || !ehArquivoDeWeb) {
    if (ext && ext !== '.html') {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end('nao encontrado');
      return;
    }
    alvo = join(PASTA, 'index.html');
  }

  res.writeHead(200, { 'content-type': TIPOS[extname(alvo).toLowerCase()] || 'text/html; charset=utf-8', 'cache-control': 'no-store' });
  createReadStream(alvo).pipe(res);
});

servidor.listen(PORTA, '127.0.0.1', () => {
  console.log(`previa em http://127.0.0.1:${PORTA}  (usuario ${USUARIO})`);
});
