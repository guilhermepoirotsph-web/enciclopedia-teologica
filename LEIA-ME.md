# Enciclopédia Teológica e Antropológica

Site institucional de **Eleno Gutemberg** — 97 estudos bíblicos, 32 eixos temáticos,
biblioteca aberta, Núcleo de Estudos (pago) e painel do autor.

Feito pela GD Studio X. Replica o acervo do Notion “Enciclopédia Teológica e
Antropológica”; o Notion original **não foi alterado**, só lido.

---

## Como rodar

```bash
npm install
npm run dev
```

Abre em <http://127.0.0.1:5178>.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | sobe o site local |
| `node scripts/publicar.mjs` | build + 404 + varredura de segredo → `dist/` |
| `npm run conteudo` | regera o acervo a partir de `_acervo/acervo.json` |
| `npm run arte` | regera selo social, ícones e OG |
| `node sql/provar.mjs` | roda as 14 provas do banco em PGlite |
| `node scripts/conferir-banco.mjs` | confere o banco de fora, como um visitante |
| `node scripts/capturar.mjs 5178` | tira print de todas as telas |

---

## Situação

### Pronto e provado
- **Banco Supabase ligado e semeado** — projeto `xssklzwhkxmavtcjorre`, 97 estudos e
  32 eixos. O texto de cada estudo foi comparado byte a byte com o original:
  **97 de 97 idênticos**.
- RLS provada de fora: as views públicas respondem, as tabelas cruas devolvem
  **zero linhas** para a chave pública.
- 97 estudos com data de criação e de revisão, busca sem acento, filtro e ordenação.
- Hero 3D (rosácea em WebGL) com mergulho pelo scroll.
- Página de estudo com índice lateral, referências bíblicas e barra de leitura.
- Núcleo de Estudos com muro de conteúdo cortado **no servidor**.
- Livro **Na Terra dos Viventes** com capa real e link da Hotmart.
- Painel do autor completo; cai em modo prévia se o banco sumir.
- Pix nativo pronto (falta só a chave), nota de esclarecimento, direitos, privacidade.

### Falta — depende de informação ou de gesto humano
1. **Contatos do Eleno**: WhatsApp, e-mail, Instagram, YouTube.
2. **Chave Pix** e nome do recebedor.
3. **Retrato do autor** (a capa do livro já está no ar).
4. **Conta de administrador**: o Eleno cria em `/entrar`, confirma o e-mail, e aí
   `sql/03-promover.sql` roda com o e-mail dele.
5. **Repositório no GitHub e domínio** para publicar.

Enquanto 1, 2 e 3 não chegam, o site **esconde** o botão correspondente em vez de
mostrar link morto ou dado inventado.

---

## Publicar — GitHub Pages

> **Lovable saiu do caminho em 12/09/2026**: o plano premium acabou e o selo
> “Edited with Lovable” não sai sem plano. A hospedagem passou a ser GitHub Pages —
> grátis, já usada em outros sites da casa e com domínio próprio suportado.

```bash
node scripts/publicar.mjs
```

Gera `dist/` pronto. O script:

- builda com a `base` certa (`/` com domínio próprio, `/nome-do-repo/` sem);
- copia `index.html` para `404.html` — é isso que faz `/biblioteca` abrir direto,
  em vez de dar 404 no GitHub Pages;
- grava o `CNAME` quando você passa o domínio;
- **varre a saída atrás de segredo e recusa publicar se achar.** Provado com uma
  chave secreta plantada no código: bloqueou e apontou o arquivo.

```bash
node scripts/publicar.mjs /enciclopedia-teologica/          # página de projeto
node scripts/publicar.mjs / enciclopediateologica.com.br    # com domínio
```

O conteúdo de `dist/` é o que vai para a branch de publicação.

**O repositório pode ser público.** A única chave no código é a *publicável*, que
existe justamente para ficar no navegador — quem decide o que ela alcança é a RLS.
A `service_role` nunca entrou no projeto, e o script recusa publicar se entrar.

---

## O banco

Projeto dedicado no Supabase (`xssklzwhkxmavtcjorre`), criado em 12/09/2026.
URL e chave ficam **hardcodadas** em `src/dados/supabase.ts` — não em `VITE_*` —
porque plataforma que gerencia deploy costuma reescrever variável de ambiente e
apontar o site para outro banco sem avisar.

Para recriar do zero, no SQL Editor e nesta ordem:

1. `sql/01-schema.sql`
2. as fatias de `sql/fatias/` (geradas por `node scripts/fatiar-seed.mjs`) — o seed
   inteiro tem 730 KB e trava o editor
3. `sql/03-promover.sql`, trocando o e-mail

Depois, sempre: `node scripts/conferir-banco.mjs`.

---

## Como o conteúdo pago é protegido

O corte **não** é feito no navegador:

- `scripts/gerar-conteudo.mjs` **não publica** em `public/` o corpo de nenhum
  estudo marcado como Núcleo — arquivo em `public/` é servido a quem souber o endereço.
- A view `artigos_publicos` devolve `corpo = null` para estudo pago.
- A função `ler_artigo` decide no servidor, pela assinatura de quem chamou, se
  devolve o texto inteiro ou só a prévia.

Provado em `sql/provar.mjs` — 14 provas, todas passando: leitor logado sem
assinatura continua barrado, assinatura vencida perde o acesso, usuário comum não
se promove a admin, visitante envia mensagem mas não lê a caixa.

### O que este site **não** faz
Não impede cópia. Nenhum site impede: o que o navegador mostra, o visitante lê.
O que existe aqui é registro de autoria com data, regras de uso escritas em
`/direitos`, e o conteúdo pago fora do alcance de quem não pagou. Prometer
“criptografar para ninguém clonar” seria vender o que não existe.

---

## Estrutura

```
_acervo/          acervo bruto lido do Notion (fora do git)
public/conteudo/  catálogo + corpo dos estudos abertos (gerado)
public/marca/     selo, og.png, ícones, capa do livro
scripts/          gerar-conteudo, gerar-arte, fatiar-seed, publicar, capturar, conferir-banco
sql/              01-schema, 02-seed (gerado), fatias/, 03-promover, provar.mjs
src/cena/         rosácea 3D (three.js)
src/dados/        fonte, supabase, sessão, pix, painel, rascunho
src/marca/        selo e assinatura em SVG
src/paginas/      site + painel
```

## Identidade

- **Obsidiana** `#05070B` · **ouro litúrgico** `#C9A24A` · **marfim** `#F4EEE2`
- Cormorant Garamond (títulos) · Spectral (leitura) · Inter (interface)
- Selo “Pórtico da Luz”: anel do cânon, doze raios, ogiva do templo, cruz de luz
  nascendo das Escrituras abertas. Sem texto dentro do SVG, de propósito — SVG com
  `<text>` perde a fonte quando entra como imagem.
