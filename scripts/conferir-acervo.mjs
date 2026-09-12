/**
 * Compara o acervo do banco com o original, estudo por estudo.
 *
 * Não é "o SQL rodou sem erro" — é "o texto que está no banco é exatamente o
 * texto que o Eleno escreveu, e a data que o site vai mostrar é a data real da
 * revisão dele". Já apareceram dois defeitos silenciosos aqui: CRLF entrando
 * pela área de transferência e um gatilho carimbando `now()` por cima da data
 * verdadeira de 97 estudos.
 *
 *   node scripts/conferir-acervo.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(RAIZ, 'public', 'conteudo', 'artigos');

const fonte = readFileSync(join(RAIZ, 'src', 'dados', 'supabase.ts'), 'utf8');
const base = process.argv[2] || fonte.match(/SUPABASE_URL = '([^']*)'/)?.[1];
const chave = process.argv[3] || fonte.match(/SUPABASE_CHAVE_PUBLICAVEL = '([^']*)'/)?.[1];

if (!base || !chave) {
  console.error('Sem URL/chave do Supabase.');
  process.exit(1);
}

const local = new Map();
for (const arq of readdirSync(DIR)) {
  const a = JSON.parse(readFileSync(join(DIR, arq), 'utf8'));
  local.set(a.slug, a);
}

const r = await fetch(`${base}/rest/v1/artigos_publicos?select=slug,titulo,corpo,criado_em,atualizado_em,referencias,eixos`, {
  headers: { apikey: chave, Authorization: `Bearer ${chave}` },
});
const banco = await r.json();

const iguais = (a, b) => new Date(a).getTime() === new Date(b).getTime();

let corpoOk = 0;
let dataOk = 0;
let refsOk = 0;
let eixosOk = 0;
const problemas = [];

for (const a of banco) {
  const l = local.get(a.slug);
  if (!l) {
    problemas.push(`${a.slug}: existe no banco e não no acervo local`);
    continue;
  }
  if (a.corpo === l.md) corpoOk++;
  else problemas.push(`${a.slug}: corpo diferente (banco ${a.corpo?.length} x local ${l.md.length})`);

  if (iguais(a.criado_em, l.criado) && iguais(a.atualizado_em, l.atualizado)) dataOk++;
  else problemas.push(`${a.slug}: data ${String(a.atualizado_em).slice(0, 10)} x ${String(l.atualizado).slice(0, 10)}`);

  if (JSON.stringify(a.referencias ?? []) === JSON.stringify(l.referencias)) refsOk++;
  if (JSON.stringify(a.eixos ?? []) === JSON.stringify(l.eixos)) eixosOk++;
}

const faltando = [...local.keys()].filter((s) => !banco.some((a) => a.slug === s));

console.log(`estudos no banco  ${banco.length} (local: ${local.size})`);
console.log(`corpo idêntico    ${corpoOk}/${banco.length}`);
console.log(`datas corretas    ${dataOk}/${banco.length}`);
console.log(`referências       ${refsOk}/${banco.length}`);
console.log(`eixos             ${eixosOk}/${banco.length}`);
if (faltando.length) console.log(`FALTANDO no banco: ${faltando.join(', ')}`);

if (problemas.length) {
  console.log('\nproblemas:');
  problemas.slice(0, 10).forEach((p) => console.log('  ' + p));
  if (problemas.length > 10) console.log(`  … e mais ${problemas.length - 10}`);
}

const tudoOk = corpoOk === banco.length && dataOk === banco.length && !faltando.length && banco.length === local.size;
console.log(tudoOk ? '\nAcervo conferido: o banco é fiel ao original.' : '\nAcervo COM divergência.');
process.exitCode = tudoOk ? 0 : 1;
