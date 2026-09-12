/**
 * Fatia sql/02-seed.sql em pedaços que cabem no editor SQL do painel.
 *
 * O seed inteiro tem ~730 KB — o editor do Supabase engasga. Cada fatia sai
 * fechada em `begin; ... commit;`: ou entra inteira, ou não entra nada.
 *
 * CUIDADO QUE JÁ CUSTOU CARO: a primeira versão limpava comentários com
 * `/^--[^\n]*\n/gm`. Parecia inofensivo, mas o corpo dos artigos é markdown e
 * tem linhas `---` (separador). O regex apagava essas linhas DE DENTRO das
 * aspas, a string SQL terminava no lugar errado e o Postgres reclamava de erro
 * de sintaxe centenas de linhas adiante. Aqui nada é "limpo": o arquivo é
 * cortado apenas nos limites entre comandos, e o conteúdo passa intacto.
 *
 *   node scripts/fatiar-seed.mjs [tamanhoKB]
 */
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');
const DESTINO = join(RAIZ, 'sql', 'fatias');
const LIMITE = (Number(process.argv[2]) || 110) * 1024;

const bruto = readFileSync(join(RAIZ, 'sql', '02-seed.sql'), 'utf8').replace(/\r\n/g, '\n');

/* Um comando começa numa linha que abre com "insert into public." e vai até o
   começo do próximo. Nada além do recorte é feito. */
const marcador = /^insert into public\./gm;
const inicios = [];
for (let m; (m = marcador.exec(bruto)); ) inicios.push(m.index);

if (!inicios.length) {
  console.error('Nenhum comando encontrado em 02-seed.sql.');
  process.exit(1);
}

const comandos = inicios.map((ini, i) => {
  const fim = i + 1 < inicios.length ? inicios[i + 1] : bruto.length;
  let c = bruto.slice(ini, fim);
  // no último pedaço sobra o "commit;" final do arquivo — e só ele
  if (i + 1 === inicios.length) c = c.replace(/\n+commit;\s*$/i, '\n');
  return c.trimEnd();
});

/* Rede de segurança: o que foi recortado tem que somar o mesmo número de
   comandos que o arquivo original anuncia. */
const esperado = (bruto.match(/^insert into public\./gm) || []).length;
if (comandos.length !== esperado) {
  console.error(`Recorte inconsistente: ${comandos.length} comandos para ${esperado} esperados.`);
  process.exit(1);
}

rmSync(DESTINO, { recursive: true, force: true });
mkdirSync(DESTINO, { recursive: true });

const fatias = [];
let atual = [];
let tamanho = 0;
for (const c of comandos) {
  if (tamanho + c.length > LIMITE && atual.length) {
    fatias.push(atual);
    atual = [];
    tamanho = 0;
  }
  atual.push(c);
  tamanho += c.length + 1;
}
if (atual.length) fatias.push(atual);

let somaComandos = 0;
fatias.forEach((f, i) => {
  somaComandos += f.length;
  const n = String(i + 1).padStart(2, '0');
  const corpo = ['begin;', '', ...f, '', 'commit;', ''].join('\n');
  writeFileSync(join(DESTINO, `seed-${n}.sql`), corpo, 'utf8');
  console.log(`seed-${n}.sql   ${String(f.length).padStart(3)} comandos   ${(corpo.length / 1024).toFixed(0)} KB`);
});

/* Prova de que nada se perdeu no caminho: quantidade de comandos e número de
   aspas simples (que é o que o bug antigo desequilibrava). */
const aspasOriginal = (bruto.match(/'/g) || []).length;
const aspasFatias = fatias.flat().join('\n').match(/'/g)?.length ?? 0;

console.log(`\ncomandos: ${somaComandos} de ${esperado}`);
console.log(`aspas simples: ${aspasFatias} nas fatias / ${aspasOriginal} no original (a diferença esperada é 0)`);

if (somaComandos !== esperado || aspasFatias !== aspasOriginal) {
  console.error('\nFATIAMENTO INCONSISTENTE — não rodar essas fatias.');
  process.exitCode = 1;
} else {
  console.log('\nFatias conferidas.');
}
