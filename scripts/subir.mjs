/**
 * Publica o site no Cloudflare Pages, num comando só.
 *
 *   node scripts/subir.mjs
 *       -> publica no endereço provisório (enciclopedia-teologica.pages.dev),
 *          fora do buscador.
 *
 *   node scripts/subir.mjs enciclopediateologica.com.br
 *       -> publica JÁ com o domínio: liga o site no buscador, arruma a
 *          canonical de cada página e aponta o sitemap para o endereço certo.
 *
 * Faz build, confere e envia. Se a varredura de segredo acusar qualquer coisa,
 * nada sobe.
 */
import { execFileSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJETO = 'enciclopedia-teologica';

// O Git Bash do Windows transforma um "/" solto no caminho de instalação dele.
// Aqui o primeiro argumento é o DOMÍNIO, então basta recusar o que tiver cara
// de caminho — e assim ninguém publica com "C:/Program Files/Git" de domínio.
const cru = (process.argv[2] || '').trim();
const dominio = /^[A-Za-z]:[\\/]|Program Files|^\/$/.test(cru) ? '' : cru;
if (cru && !dominio) console.log(`aviso: argumento "${cru}" veio mexido pelo shell; publicando sem domínio`);

const passo = (t) => console.log(`\n── ${t}\n`);

passo(dominio ? `Build para ${dominio}` : 'Build para o endereço provisório');
execFileSync(process.execPath, [join(RAIZ, 'scripts', 'publicar.mjs'), '/', dominio], {
  cwd: RAIZ,
  stdio: 'inherit',
});

// O dist já serviu de repositório git em outra época; se sobrar um .git ali,
// ele vai junto para o servidor — com o histórico inteiro dentro.
const gitNoDist = join(RAIZ, 'dist', '.git');
if (existsSync(gitNoDist)) {
  rmSync(gitNoDist, { recursive: true, force: true });
  console.log('removido um .git que estava dentro de dist/ — ele iria junto para o ar');
}

passo('Enviando para o Cloudflare Pages');
// Chama o binário do wrangler que está NO PROJETO, não via npx: sem shell
// (que traz aviso de segurança do Node), sem baixar pacote a cada publicação e
// com a versão fixada no package.json — publicação não pode depender do que o
// registro do npm estiver servindo hoje.
execFileSync(process.execPath, [
  join(RAIZ, 'node_modules', 'wrangler', 'bin', 'wrangler.js'),
  'pages', 'deploy', 'dist',
  `--project-name=${PROJETO}`, '--branch=main', '--commit-dirty=true',
], { cwd: RAIZ, stdio: 'inherit' });

passo('Conferindo no ar');
execFileSync(process.execPath, [join(RAIZ, 'scripts', 'conferir-no-ar.mjs'), dominio ? `https://${dominio}/` : `https://${PROJETO}.pages.dev/`], {
  cwd: RAIZ,
  stdio: 'inherit',
});
