/**
 * Prepara a pasta de publicação para o GitHub Pages.
 *
 *   node scripts/publicar.mjs                      -> domínio próprio (base '/')
 *   node scripts/publicar.mjs /enciclopedia-teologica/   -> página de projeto
 *   node scripts/publicar.mjs / enciclopediateologica.com.br  -> já grava o CNAME
 *
 * O que ele faz além de buildar:
 *  - copia index.html para 404.html (o GitHub Pages serve 404.html quando o
 *    caminho não é um arquivo; é assim que /biblioteca abre direto num SPA);
 *  - grava CNAME quando há domínio;
 *  - VARRE a pasta atrás de segredo antes de liberar a publicação.
 *
 * A varredura é o ponto principal. As chaves de produção vivem dentro do código
 * agora, e a publicável pode ir para um repositório público sem problema — é
 * para isso que ela existe. Uma chave SECRETA, não: se um dia alguém colar a
 * `service_role` no lugar errado, quem tem que gritar é este script, antes de o
 * arquivo virar histórico público num repositório do GitHub.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, writeFileSync, statSync, copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(RAIZ, 'dist');

// O Git Bash do Windows converte um argumento "/" solto no caminho de instalação
// dele ("C:/Program Files/Git"). Sem esta rede, o build sai com base errada e
// TODOS os caminhos do site apontam para o nada — e o script ainda diz "pronto".
const cru = process.argv[2] || '/';
const base = /^[A-Za-z]:[\\/]/.test(cru) || cru.includes('Program Files') ? '/' : cru;
if (base !== cru) console.log(`aviso: argumento "${cru}" veio mexido pelo shell; usando base "/"`);

const dominio = process.argv[3] || '';

/* ---------------------------------------------------------------- build */

console.log(`build com base "${base}"…`);
// Chama o binário do Vite direto, sem passar pelo npm: o caminho do projeto tem
// espaço e acento ("Área de Trabalho"), e é aí que npm.cmd e --prefix quebram.
execFileSync(process.execPath, [join(RAIZ, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'], {
  cwd: RAIZ,
  stdio: 'inherit',
  env: { ...process.env, BASE: base },
});

/* ------------------------------------------------------- 404 e domínio */

copyFileSync(join(DIST, 'index.html'), join(DIST, '404.html'));
console.log('404.html criado (fallback de rota do GitHub Pages)');

if (dominio) {
  writeFileSync(join(DIST, 'CNAME'), dominio + '\n', 'utf8');
  console.log('CNAME gravado: ' + dominio);
}

/* ------------------------------------------------- varredura de segredo */

// Padrões que NÃO podem sair daqui. A chave publicável (sb_publishable_ / a
// anon JWT com role "anon") é pública por natureza e não entra nesta lista.
const PROIBIDO = [
  { nome: 'chave secreta do Supabase', re: /sb_secret_[A-Za-z0-9_-]{8,}/ },
  { nome: 'service_role', re: /"role"\s*:\s*"service_role"|service_role_key|SUPABASE_SERVICE_ROLE/ },
  { nome: 'senha de banco', re: /postgres(?:ql)?:\/\/[^\s"']*:[^\s"'@]+@/ },
  { nome: 'chave privada', re: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { nome: 'token do GitHub', re: /gh[pousr]_[A-Za-z0-9]{30,}/ },
];

const TEXTO = new Set(['.html', '.js', '.css', '.json', '.txt', '.xml', '.map', '.svg', '']);

function varrer(dir) {
  const achados = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      achados.push(...varrer(caminho));
      continue;
    }
    if (!TEXTO.has(extname(nome).toLowerCase())) continue;
    const conteudo = readFileSync(caminho, 'utf8');
    for (const p of PROIBIDO) {
      if (p.re.test(conteudo)) achados.push(`${p.nome} em ${caminho.slice(RAIZ.length + 1)}`);
    }
  }
  return achados;
}

const achados = varrer(DIST);

if (achados.length) {
  console.error('\nPUBLICAÇÃO BLOQUEADA — segredo encontrado na pasta de saída:');
  achados.forEach((a) => console.error('  ' + a));
  console.error('\nTire o segredo do código antes de publicar. Nada foi enviado.');
  process.exit(1);
}

console.log('varredura de segredo: limpa');

/* ------------------------------------------------------------ conferência */

const index = readFileSync(join(DIST, 'index.html'), 'utf8');
const temConteudo = existsSync(join(DIST, 'conteudo', 'indice.json'));
const artigos = temConteudo ? JSON.parse(readFileSync(join(DIST, 'conteudo', 'indice.json'), 'utf8')).length : 0;

console.log(`\npronto em dist/`);
console.log(`  base no html   ${(index.match(/(?:src|href)="([^"]*?)\/assets\//) || [, '/'])[1] || '/'}/assets/`);
console.log(`  acervo local   ${artigos} estudos (rede de segurança se o banco cair)`);
console.log(`  404.html       sim`);
console.log(`  CNAME          ${dominio || '(sem domínio ainda)'}`);
console.log(`\nO conteúdo de dist/ é o que vai para a branch de publicação.`);
