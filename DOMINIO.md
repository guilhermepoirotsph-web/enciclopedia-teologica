# Colocar a Enciclopédia num domínio próprio

Hoje o site está no ar em **https://enciclopedia-teologica.pages.dev**, hospedado no
Cloudflare Pages (projeto `enciclopedia-teologica`, conta `guilhermepoirotsph@gmail.com`).

Este guia é o caminho do endereço provisório até `enciclopediateologica.com.br` (ou o
nome que você escolher). São 4 etapas; as 3 primeiras são suas, a última é um comando.

---

## Antes: escolher o nome

Sugestões, da mais direta para a mais curta:

| Domínio | Prós | Contras |
| --- | --- | --- |
| `enciclopediateologica.com.br` | diz exatamente o que é | 29 caracteres, longo para ditar |
| `elenogutemberg.com.br` | é o nome dele, serve para o livro também | não diz o que é |
| `teologicaeantropologica.com.br` | fiel ao título | difícil de escrever |

**Confira se está livre** antes de qualquer coisa, em <https://registro.br> (campo de
busca na página inicial). Um `.com.br` custa cerca de **R$ 40/ano**.

> Cuidado que já nos mordeu: registre também a variação com erro de digitação óbvio se
> ela estiver livre e for barata. No site da Odonto Vitallis, a versão com um "L" a
> menos já era de outra pessoa.

---

## Etapa 1 — Registrar o domínio (registro.br)

1. Entre em <https://registro.br> com a conta dele (ou a sua, se for você quem paga).
2. Busque o domínio, adicione ao carrinho e pague.
3. **Isto só você pode fazer.** Envolve CPF/CNPJ e pagamento — eu não faço no seu lugar.

Depois de pagar, o domínio existe, mas ainda **não aponta para lugar nenhum**.

---

## Etapa 2 — Trazer o domínio para o Cloudflare

Este é o caminho recomendado, e é bem mais simples que mexer em registro por registro.

1. No painel do Cloudflare, canto superior esquerdo → **Add a domain**.
2. Digite o domínio que você registrou e escolha o plano **Free**.
3. O Cloudflare vai varrer o domínio e mostrar **dois servidores de nome** (nameservers),
   parecidos com:
   ```
   xxx.ns.cloudflare.com
   yyy.ns.cloudflare.com
   ```
   **Copie os dois.**
4. Volte ao **registro.br** → seu domínio → **Alterar servidores DNS** →
   **Usar servidores DNS próprios** → cole os dois endereços do Cloudflare → salvar.
5. Volte ao Cloudflare e clique em **Check nameservers**.

⏳ **Quanto tempo demora:** o registro.br leva de alguns minutos até algumas horas.
Num domínio recém-registrado, a zona pode levar **cerca de 1h30** para publicar —
isso é normal e não é erro. Enquanto isso o Cloudflare fica dizendo "Pending".

> O painel do registro.br **não aceita automação**: a janela do navegador precisa estar
> visível na tela, senão o Chrome congela a aba e a tela nem desenha. Essa parte é no
> braço mesmo.

---

## Etapa 3 — Ligar o domínio no site

Com o domínio já ativo no Cloudflare (status **Active**):

1. Painel do Cloudflare → **Workers & Pages** → projeto **enciclopedia-teologica**.
2. Aba **Custom domains** → **Set up a custom domain**.
3. Digite o domínio (ex.: `enciclopediateologica.com.br`) → **Continue** → **Activate**.
4. Repita para o `www.` (ex.: `www.enciclopediateologica.com.br`).

O Cloudflare cria o registro DNS e **emite o certificado HTTPS sozinho** — não precisa
comprar nem configurar certificado. Leva de 1 a 15 minutos para o cadeado aparecer.

---

## Etapa 4 — Tirar o site do modo provisório (o comando)

Enquanto o endereço era provisório, o site saiu **de fora do Google de propósito**:
com `noindex`, sem `canonical` e com o `robots.txt` fechado. Isso evita que o endereço
`.pages.dev` vire concorrente do domínio de verdade nas buscas.

Com o domínio funcionando, rode **um comando**:

```bash
node scripts/subir.mjs enciclopediateologica.com.br
```

Ele faz tudo: build com o domínio certo, tira o `noindex`, arruma a `canonical` de cada
uma das 139 páginas, aponta o `sitemap.xml` para o endereço novo, varre a pasta atrás de
segredo, envia para o Cloudflare e **confere no ar** no fim.

Sem argumento nenhum (`node scripts/subir.mjs`), ele republica no endereço provisório e
mantém o site fora do buscador — que é o certo até o domínio existir.

---

## Etapa 5 — Avisar o Google (opcional, mas vale)

1. <https://search.google.com/search-console> → **Adicionar propriedade** → **Domínio**.
2. O Google pede um registro TXT: copie e cole no Cloudflare em **DNS → Add record**.
3. Depois de verificado, envie o sitemap: `https://SEUDOMINIO/sitemap.xml`.

São 137 endereços no sitemap (home + 10 páginas fixas + 97 estudos + 32 eixos), cada um
com título e descrição próprios.

---

## Conferir se deu certo

```bash
node scripts/conferir-no-ar.mjs https://enciclopediateologica.com.br/
```

Tem que dar **"Tudo conferido"**, com todas as linhas OK. Ele prova pela rede: o HTML
aponta para o pacote certo, o pacote existe, o acervo tem os 97 estudos e a rota funda
de um artigo responde **200** (e não um 404 disfarçado).

E confira estas três coisas na mão:

- `https://SEUDOMINIO` abre **com cadeado**;
- `https://SEUDOMINIO/artigo/fe` abre direto, sem passar pela home;
- ver o código-fonte da página e conferir que **não** tem mais `noindex`.

---

## Duas decisões pendentes

**1. O GitHub Pages continua no ar.**
O endereço antigo (`guilhermepoirotsph-web.github.io/enciclopedia-teologica`) ainda
responde. Enquanto os dois estiverem com `noindex`, não atrapalha o Google — mas são
dois endereços do mesmo site circulando. Quando o domínio existir, o certo é desligar:
GitHub → repositório → **Settings → Pages → Source: None**.

**2. O repositório é público.**
Precisa ser para o GitHub Pages grátis. No Cloudflare **não precisa** — a publicação é
por envio direto, não por leitura do repositório. Se preferir fechar o repositório,
agora dá: GitHub → **Settings → General → Change visibility → Private**. O site
continua funcionando igual.

---

## Onde as coisas moram

| O quê | Onde |
| --- | --- |
| Hospedagem | Cloudflare Pages, projeto `enciclopedia-teologica` |
| Banco de dados | Supabase, projeto `xssklzwhkxmavtcjorre` |
| Código | GitHub, `guilhermepoirotsph-web/enciclopedia-teologica` |
| Livro | Hotmart (link no painel, em Configurações) |
| Publicar | `node scripts/subir.mjs [dominio]` |
