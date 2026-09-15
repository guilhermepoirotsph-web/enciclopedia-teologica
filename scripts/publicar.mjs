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
import { readdirSync, readFileSync, writeFileSync, statSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
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

// O domínio pode vir do argumento OU da variável DOMINIO — é assim que o
// Cloudflare Pages liga o site no buscador no dia do domínio, mexendo só numa
// caixa do painel dele, sem tocar no código.
const dominio = (process.argv[3] || process.env.DOMINIO || '').trim();

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

/* ------------------------------------------------- páginas de verdade */

/**
 * Pré-gera um index.html para CADA rota.
 *
 * Sem isso, o GitHub Pages devolve o 404.html em toda rota funda: o site abre
 * (o app assume e roteia), mas o servidor responde **HTTP 404**. Para o
 * visitante não muda nada; para o Google, cada um dos 97 estudos é uma página
 * inexistente. Num acervo cujo valor inteiro é ser encontrado, isso é o defeito
 * mais caro possível — e é invisível olhando o site no navegador.
 *
 * Cada arquivo gerado ainda leva título, descrição e og: próprios, então o
 * estudo chega ao buscador e ao WhatsApp com o nome certo, não com o nome do
 * site repetido 97 vezes.
 */
const modelo = readFileSync(join(DIST, 'index.html'), 'utf8');
const indicePath = join(DIST, 'conteudo', 'indice.json');
const eixosPath = join(DIST, 'conteudo', 'eixos.json');

const escapar = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function gerarPagina(rota, titulo, descricao) {
  let html = modelo
    .replace(/<title>[^<]*<\/title>/, `<title>${escapar(titulo)}</title>`)
    .replace(/(<meta\s+name="description"\s+content=")[^"]*(")/, `$1${escapar(descricao)}$2`)
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/, `$1${escapar(titulo)}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/, `$1${escapar(descricao)}$2`);

  if (dominio) {
    html = html.replace(/(<link\s+rel="canonical"\s+href=")[^"]*(")/, `$1https://${dominio}${rota}$2`);
  } else {
    // Sem domínio definitivo, o site fica FORA do buscador.
    // Duas razões, as duas sérias:
    //  - indexar o endereço temporário do github.io cria um concorrente do
    //    domínio real no dia em que ele existir;
    //  - a canonical aponta para um domínio que ainda não responde, e canonical
    //    quebrada é pior que canonical nenhuma.
    // O `--noindex` sai sozinho no build com domínio.
    html = html
      .replace(/<link\s+rel="canonical"[^>]*>/, '')
      .replace(/(<meta\s+name="robots"\s+content=")[^"]*(")/, '$1noindex, nofollow$2');
  }

  const pasta = join(DIST, ...rota.split('/').filter(Boolean));
  mkdirSync(pasta, { recursive: true });
  writeFileSync(join(pasta, 'index.html'), html, 'utf8');
}

const FIXAS = [
  ['/biblioteca', 'Biblioteca — Enciclopédia Teológica e Antropológica', 'Todo o acervo, aberto e sem login: estudos bíblicos, doutrina, história e sociedade, organizados por eixo temático.'],
  ['/eixos', 'Eixos temáticos — Enciclopédia Teológica e Antropológica', 'O mapa do acervo: cada estudo entra num eixo, e cada eixo responde a uma pergunta real de quem estuda a Bíblia.'],
  ['/nucleo', 'Núcleo de Estudos — Enciclopédia Teológica e Antropológica', 'Material aprofundado em ordem de leitura, aparato de apoio e acesso direto ao autor. A biblioteca continua aberta.'],
  ['/livro', 'Na Terra dos Viventes — Espírito, Alma e Corpo | Eleno Gutemberg', 'O livro em que Eleno Gutemberg enfrenta a constituição do ser humano: o que somos, o que morre e o que atravessa.'],
  ['/autor', 'Eleno Gutemberg — Enciclopédia Teológica e Antropológica', 'Pesquisador e escritor. Mantém este acervo com revisão contínua e é autor de Na Terra dos Viventes.'],
  ['/apoie', 'Apoie a obra — Enciclopédia Teológica e Antropológica', 'O acervo é aberto e continua aberto. Quem quiser sustentar a pesquisa ajuda por aqui.'],
  ['/contato', 'Contato — Enciclopédia Teológica e Antropológica', 'Dúvida sobre um estudo, correção fundamentada, convite ou imprensa.'],
  ['/esclarecimento', 'Nota de esclarecimento — Enciclopédia Teológica e Antropológica', 'A posição editorial deste acervo, na íntegra: liberdade de crença, liberdade acadêmica e abertura à correção.'],
  ['/direitos', 'Direitos autorais e uso do conteúdo — Enciclopédia Teológica', 'O que você pode fazer com estes textos sem pedir, e o que precisa de autorização por escrito.'],
  ['/privacidade', 'Privacidade — Enciclopédia Teológica e Antropológica', 'O que este site coleta — que é pouco — e o que faz com isso.'],
];

let paginas = 0;
for (const [rota, titulo, descricao] of FIXAS) {
  gerarPagina(rota, titulo, descricao);
  paginas++;
}

if (existsSync(indicePath)) {
  for (const a of JSON.parse(readFileSync(indicePath, 'utf8'))) {
    const resumo = a.resumo || `Estudo de ${a.eixos.join(', ')} por Eleno Gutemberg.`;
    gerarPagina(`/artigo/${a.slug}`, `${a.titulo} — Enciclopédia Teológica`, resumo);
    paginas++;
  }
}

if (existsSync(eixosPath)) {
  for (const e of JSON.parse(readFileSync(eixosPath, 'utf8'))) {
    gerarPagina(`/eixo/${e.slug}`, `${e.nome} — Enciclopédia Teológica`, e.descricao || `Estudos reunidos sob o eixo ${e.nome}.`);
    paginas++;
  }
}

console.log(`${paginas} páginas pré-geradas (cada rota responde HTTP 200, com título e descrição próprios)`);

if (dominio) {
  writeFileSync(join(DIST, 'CNAME'), dominio + '\n', 'utf8');
  console.log('CNAME gravado: ' + dominio);
} else {
  // robots fechado enquanto o endereço for provisório
  writeFileSync(join(DIST, 'robots.txt'), '# Endereco provisorio: fora do buscador ate o dominio definitivo.\nUser-agent: *\nDisallow: /\n', 'utf8');
  writeFileSync(join(DIST, 'index.html'), readFileSync(join(DIST, 'index.html'), 'utf8').replace(/<link\s+rel="canonical"[^>]*>/, '').replace(/(<meta\s+name="robots"\s+content=")[^"]*(")/, '$1noindex, nofollow$2'), 'utf8');
  copyFileSync(join(DIST, 'index.html'), join(DIST, '404.html'));
  console.log('sem domínio: robots fechado e noindex em todas as páginas');
}

/* ----------------------------------------- demonstração do painel */

/**
 * Publica junto uma cópia do site em /demonstracao, construída SEM banco.
 *
 * É o que permite o autor conhecer o painel antes de existir conta de
 * administrador — e permanente, sem depender de nenhum computador ligado.
 * Não há dado real ali: o painel roda em modo prévia, gravando num rascunho do
 * próprio navegador, com tarja amarela permanente. Fica fora do buscador.
 */
const baseDemo = base.replace(/\/?$/, '/') + 'demonstracao/';
execFileSync(process.execPath, [join(RAIZ, 'node_modules', 'vite', 'bin', 'vite.js'), 'build', '--outDir', 'dist/demonstracao', '--emptyOutDir'], {
  cwd: RAIZ,
  stdio: 'ignore',
  env: { ...process.env, BASE: baseDemo, VITE_PREVIA: '1' },
});
copyFileSync(join(DIST, 'demonstracao', 'index.html'), join(DIST, 'demonstracao', '404.html'));
writeFileSync(join(DIST, 'demonstracao', 'robots.txt'), 'User-agent: *\nDisallow: /\n', 'utf8');

// A demonstração NÃO pode levar chave de banco: é o único build que qualquer
// um abre sem senha, e o painel dela aceita entrar com um clique.
const demoJs = readdirSync(join(DIST, 'demonstracao', 'assets')).filter((n) => n.endsWith('.js'));
const demoSuja = demoJs.filter((n) => {
  const c = readFileSync(join(DIST, 'demonstracao', 'assets', n), 'utf8');
  return /sb_(?:publishable|secret)_[A-Za-z0-9_-]{12,}/.test(c) || /[a-z0-9]{20}\.supabase\.co/.test(c);
});
if (demoSuja.length) {
  console.error('\nPUBLICAÇÃO BLOQUEADA — a demonstração levou referência ao banco: ' + demoSuja.join(', '));
  process.exit(1);
}
console.log(`demonstração do painel em ${baseDemo} (sem banco, fora do buscador)`);

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
