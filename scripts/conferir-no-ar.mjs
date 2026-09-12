/**
 * Confere o site publicado, de fora, pela rede.
 *
 * Rota de SPA devolve 200 mesmo sem o código novo (é só a casca), então
 * "abriu" não prova nada. O que prova é: o HTML aponta para o bundle certo,
 * o bundle existe, o acervo existe, e o 404 do Pages devolve o app em vez de
 * uma página de erro do GitHub.
 *
 *   node scripts/conferir-no-ar.mjs [url]
 */
const BASE = (process.argv[2] || 'https://guilhermepoirotsph-web.github.io/enciclopedia-teologica/').replace(/\/?$/, '/');

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function pegar(caminho) {
  const r = await fetch(BASE + caminho, { redirect: 'follow' });
  return { status: r.status, tipo: r.headers.get('content-type') || '', corpo: await r.text() };
}

// O Pages leva um tempo para publicar a primeira vez.
let home = null;
for (let i = 1; i <= 20; i++) {
  try {
    const r = await pegar('');
    if (r.status === 200 && /Enciclop/i.test(r.corpo)) {
      home = r;
      break;
    }
    console.log(`tentativa ${i}: HTTP ${r.status} — esperando o Pages publicar…`);
  } catch (e) {
    console.log(`tentativa ${i}: ${String(e.message).slice(0, 60)}`);
  }
  await esperar(15000);
}

if (!home) {
  console.error('\nO site não respondeu a tempo. Confira Settings → Pages no repositório.');
  process.exit(1);
}

const bundle = home.corpo.match(/src="([^"]*assets\/index-[^"]+\.js)"/)?.[1];
const css = home.corpo.match(/href="([^"]*assets\/[^"]+\.css)"/)?.[1];

const checagens = [];
const anota = (nome, ok, detalhe = '') => checagens.push({ nome, ok, detalhe });

anota('home responde', home.status === 200, `HTTP ${home.status}`);
anota('título no HTML', /Enciclopédia Teológica/.test(home.corpo));
anota('caminho do bundle com a base certa', Boolean(bundle && bundle.includes('/enciclopedia-teologica/')), bundle || 'não achei');

for (const [nome, caminho] of [
  ['bundle carrega', bundle?.replace(/^\/enciclopedia-teologica\//, '')],
  ['css carrega', css?.replace(/^\/enciclopedia-teologica\//, '')],
  ['acervo publicado', 'conteudo/indice.json'],
  ['selo da marca', 'marca/selo.svg'],
  ['imagem social', 'marca/og.png'],
  ['sitemap', 'sitemap.xml'],
]) {
  if (!caminho) {
    anota(nome, false, 'sem caminho');
    continue;
  }
  const r = await pegar(caminho);
  anota(nome, r.status === 200, `HTTP ${r.status}`);
}

// rota funda: o Pages devolve 404.html, que é o app inteiro
const funda = await pegar('artigo/fe');
anota('rota funda cai no app (404.html)', /Enciclopédia Teológica/.test(funda.corpo), `HTTP ${funda.status}`);

// quantos estudos o site publicado carrega
const indice = await pegar('conteudo/indice.json');
let quantos = 0;
try {
  quantos = JSON.parse(indice.corpo).length;
} catch {
  /* segue */
}
anota('97 estudos no acervo publicado', quantos === 97, `${quantos} estudos`);

console.log('\nSITE NO AR — ' + BASE + '\n');
let falhas = 0;
for (const c of checagens) {
  if (!c.ok) falhas++;
  console.log(`  ${c.ok ? 'OK   ' : 'FALHA'} ${c.nome.padEnd(36)} ${c.detalhe}`);
}
console.log(falhas ? `\n${falhas} falha(s).` : '\nTudo conferido.');
process.exitCode = falhas ? 1 : 0;
