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
| `npm run build` | gera `dist/` para publicar |
| `npm run conteudo` | regera o acervo a partir de `_acervo/acervo.json` |
| `npm run arte` | regera logo social, ícones e OG |
| `node sql/provar.mjs` | roda as 14 provas do banco em PGlite |
| `node scripts/capturar.mjs 5178` | tira print de todas as telas |

---

## O que está pronto e o que falta

### Pronto
- 97 estudos reais, com data de criação e de revisão de cada um
- 32 eixos temáticos, busca sem acento, filtro e ordenação
- Hero 3D (rosácea em WebGL) com mergulho pelo scroll
- Página de estudo com índice lateral, referências bíblicas e barra de leitura
- Núcleo de Estudos com muro de conteúdo e catálogo de obras
- Livro **Na Terra dos Viventes** com link real da Hotmart
- Painel do autor completo, com modo prévia enquanto não há banco
- Pix nativo pronto (falta só a chave), nota de esclarecimento, direitos autorais, privacidade
- Esquema SQL com RLS provada

### Falta (depende de informação ou de ação humana)
1. **Supabase**: criar o projeto e colar URL + chave em `src/dados/supabase.ts`
2. **Contatos do Eleno**: WhatsApp, e-mail, Instagram, YouTube
3. **Chave Pix** e nome do recebedor
4. **Capa do livro** e retrato do autor (hoje há capa tipográfica e o selo no lugar)
5. **Domínio** e publicação

Enquanto 2, 3 e 4 não chegam, o site **esconde** o botão correspondente em vez de
mostrar link morto ou dado inventado.

---

## Ligar o banco (uma vez só)

1. Criar um projeto Supabase **novo, dedicado a este site**.
2. SQL Editor → colar e rodar, nesta ordem:
   - `sql/01-schema.sql`
   - `sql/02-seed.sql` (os 97 estudos)
   - `sql/03-promover.sql` (trocando o e-mail pelo do Eleno)
3. Authentication → Providers → Email: deixar **confirmação de e-mail ligada**.
4. Copiar *Project URL* e *anon/publishable key* para `src/dados/supabase.ts`.

> As chaves ficam **hardcodadas** nesse arquivo, não em `VITE_*`: o Lovable Cloud
> reescreve variáveis de ambiente e apontaria o site para o banco gerenciado dele.
> A `service_role` **nunca** entra no projeto.

Antes de existir banco, o site inteiro funciona lendo `public/conteudo/` e o painel
entra em **modo prévia** (tarja amarela permanente, nada é salvo no servidor).

---

## Como o conteúdo pago é protegido

O corte **não** é feito no navegador:

- `scripts/gerar-conteudo.mjs` **não publica** em `public/` o corpo de nenhum
  estudo marcado como Núcleo — arquivo em `public/` é servido a quem souber o
  endereço.
- A view `artigos_publicos` devolve `corpo = null` para estudo pago.
- A função `ler_artigo` decide no servidor, pela assinatura de quem chamou, se
  devolve o texto inteiro ou a prévia.

Provado em `sql/provar.mjs` (14 provas, todas passando), inclusive: leitor logado
sem assinatura continua barrado, assinatura vencida perde o acesso, e usuário
comum não consegue se promover a admin.

### O que este site **não** faz
Não impede cópia. Nenhum site impede: o que o navegador mostra, o visitante lê.
O que existe aqui é registro de autoria com data, regras de uso escritas em
`/direitos` e o conteúdo pago fora do alcance de quem não pagou. Prometer
“criptografar para ninguém clonar” seria vender o que não existe.

---

## Estrutura

```
_acervo/          acervo bruto lido do Notion (fora do git)
public/conteudo/  catálogo + corpo dos estudos abertos (gerado)
public/marca/     selo, og.png, ícones (gerado)
scripts/          gerar-conteudo, gerar-arte, capturar
sql/              01-schema, 02-seed (gerado), 03-promover, provar.mjs
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
