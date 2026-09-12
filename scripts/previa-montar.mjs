/**
 * Monta dist-previa/: o build de aprovação, SEM banco.
 *
 * Sem banco o painel entra em modo prévia e fica navegável inteiro, com tarja
 * permanente — que é justamente o que o autor precisa ver antes de existir uma
 * conta de administrador. O conteúdo é o mesmo: os 97 estudos saem de
 * public/conteudo/.
 *
 *   node scripts/previa-montar.mjs
 */
import { execFileSync } from 'node:child_process';
import { rmSync, existsSync, readFileSync, copyFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(RAIZ, 'dist');
const SAIDA = join(RAIZ, 'dist-previa');

console.log('build de prévia (sem banco)…');

rmSync(SAIDA, { recursive: true, force: true });

// Build direto na pasta da prévia (--outDir). Guardar e restaurar dist/ com
// rename dava EPERM no OneDrive, que segura a pasta enquanto sincroniza.
execFileSync(process.execPath, [join(RAIZ, 'node_modules', 'vite', 'bin', 'vite.js'), 'build', '--outDir', 'dist-previa', '--emptyOutDir'], {
  cwd: RAIZ,
  stdio: 'inherit',
  env: { ...process.env, BASE: '/', VITE_PREVIA: '1' },
});

copyFileSync(join(SAIDA, 'index.html'), join(SAIDA, '404.html'));

// robots fechado: endereço temporário não entra em buscador
writeFileSync(join(SAIDA, 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8');

/* Conferência: o build de prévia NÃO pode levar chave de banco nenhuma. */
function varrer(dir) {
  const achados = [];
  for (const nome of readdirSync(dir)) {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) {
      achados.push(...varrer(caminho));
      continue;
    }
    if (!/\.(js|html|css|json|txt)$/i.test(nome)) continue;
    const c = readFileSync(caminho, 'utf8');
    // Procura CHAVE DE VERDADE e o endereço do projeto — não os prefixos soltos
    // `sb_publishable_` / `sb_secret_`, que a própria biblioteca do Supabase
    // carrega para reconhecer o formato da chave e sempre estariam aqui.
    const chaveInteira = /sb_(?:publishable|secret)_[A-Za-z0-9_-]{12,}/;
    const hostDeProjeto = /[a-z0-9]{20}\.supabase\.co/;
    if (chaveInteira.test(c) || hostDeProjeto.test(c)) achados.push(caminho.slice(RAIZ.length + 1));
  }
  return achados;
}

const vazando = varrer(SAIDA);
if (vazando.length) {
  console.error('\nPRÉVIA BLOQUEADA — o build de prévia levou referência ao banco:');
  vazando.forEach((v) => console.error('  ' + v));
  process.exit(1);
}

const artigos = JSON.parse(readFileSync(join(SAIDA, 'conteudo', 'indice.json'), 'utf8')).length;
console.log(`\ndist-previa/ pronto`);
console.log(`  ${artigos} estudos vindos do acervo publicado`);
console.log(`  sem chave de banco: conferido`);
console.log(`  404.html e robots fechado: sim`);
console.log(`\nAgora: powershell -ExecutionPolicy Bypass -File previa.ps1`);
