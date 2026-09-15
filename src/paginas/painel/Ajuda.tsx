/**
 * Tutorial dentro do próprio painel, escrito para quem não é de informática.
 * O modelo da casa é cliente autossuficiente: o painel não pode depender de
 * ligar para a agência para publicar um texto.
 */
export default function Ajuda() {
  return (
    <>
      <header className="painel__cabeca">
        <div>
          <p className="rotulo">Tutorial</p>
          <h1>Como usar o painel</h1>
        </div>
      </header>

      <div className="leitura" style={{ maxWidth: '72ch' }}>
        <h2>Publicar um estudo novo</h2>
        <ol>
          <li>Clique em <strong>Escrever novo</strong> no menu da esquerda.</li>
          <li>Escreva o título. É ele que vira o endereço da página.</li>
          <li>
            Escreva o <strong>resumo</strong>: duas linhas no máximo. É o que aparece no cartão da
            biblioteca e no Google — é ele que faz a pessoa clicar.
          </li>
          <li>Escolha um ou mais <strong>eixos temáticos</strong> clicando nas etiquetas.</li>
          <li>Escreva o texto no campo grande, ou cole de onde já estiver escrito.</li>
          <li>
            Clique em <strong>Como vai aparecer</strong> para conferir antes de qualquer pessoa ver.
          </li>
          <li>
            Marque <strong>No ar</strong> e clique em <strong>Salvar</strong>. Sem essa marca, o
            estudo fica guardado como rascunho e ninguém vê.
          </li>
        </ol>

        <h2>Formatar o texto</h2>
        <p>O texto é escrito com marcas simples no começo da linha:</p>
        <ul>
          <li><code>## Título da seção</code> — divisão grande, com filete dourado em cima.</li>
          <li><code>### Subtítulo</code> — divisão menor, em dourado.</li>
          <li><code>- item</code> — lista com marcador.</li>
          <li><code>1. item</code> — lista numerada.</li>
          <li><code>**palavra**</code> — negrito. <code>*palavra*</code> — itálico.</li>
          <li>
            <code>João 3:16 — Porque Deus amou o mundo…</code> — escrito assim, vira
            automaticamente uma epígrafe destacada, com a referência em negrito.
          </li>
        </ul>

        <h2>Colocar link no meio do texto</h2>
        <p>
          Não precisa decorar nada: selecione a palavra que vai virar link e use a barra de botões
          em cima do campo de escrever.
        </p>
        <ul>
          <li>
            <strong>🔗 Link</strong> — para um endereço de fora (uma notícia, um artigo de outro
            site, a página do livro). Ele pergunta o endereço e monta o link. Esses links abrem em
            uma <em>aba nova</em>, para o leitor não perder o estudo que estava lendo.
          </li>
          <li>
            <strong>✦ Ligar a outro estudo</strong> — para apontar para outro texto seu. Abre a
            lista dos seus estudos com busca: você escolhe <em>pelo título</em> e o endereço é
            montado sozinho. É o jeito certo de fazer, porque assim o link nunca sai errado.
          </li>
        </ul>
        <blockquote className="versiculo">
          Amarrar os estudos uns nos outros é o que transforma 97 textos soltos numa enciclopédia de
          verdade. Quando falar de fé num artigo de escatologia, ligue para o estudo sobre a Fé — o
          leitor segue a linha e fica.
        </blockquote>
        <p>
          Se preferir escrever na mão, o formato é{' '}
          <code>[o texto que aparece](o endereço)</code>.
        </p>

        <h2>A trilha sonora (a “rádio”)</h2>
        <p>
          Em <strong>Configurações → Trilha sonora do site</strong> você escolhe um fundo musical
          para quem estiver lendo. Há três trilhas prontas — <em>Nave</em>, <em>Vitral</em> e{' '}
          <em>Salmo</em> — e um botão <strong>Ouvir</strong> para experimentar antes de salvar. Se
          você tiver uma gravação sua, escolha “Gravação própria” e cole o endereço do áudio.
        </p>
        <ul>
          <li>
            A música <strong>nunca começa sozinha</strong>. O visitante vê um botão pequeno no canto
            da tela e decide se quer ouvir. É o que os navegadores permitem, e é o certo a fazer com
            quem abriu o site no meio do trabalho.
          </li>
          <li>
            O volume que você escolhe é só o <em>inicial</em>; quem estiver lendo pode mudar.
          </li>
          <li>
            Escolhendo <strong>“Sem trilha”</strong>, o botão some do site e ninguém ouve nada.
          </li>
        </ul>

        <h2>Estudo aberto x estudo do Núcleo</h2>
        <p>
          Toda linha da lista de <strong>Estudos</strong> tem duas chavinhas: <strong>No ar</strong> e{' '}
          <strong>Núcleo</strong>.
        </p>
        <ul>
          <li><strong>No ar desligado</strong> — rascunho, invisível para o público.</li>
          <li><strong>No ar ligado, Núcleo desligado</strong> — aberto, qualquer pessoa lê.</li>
          <li>
            <strong>Núcleo ligado</strong> — quem não é membro vê só a abertura e um convite. O corte
            é feito no servidor: o texto inteiro nem chega ao navegador de quem não pode ler.
          </li>
        </ul>

        <h2>Fazer o WhatsApp e o Pix aparecerem</h2>
        <p>
          Em <strong>Configurações</strong>, campo vazio significa botão escondido. Ao preencher o
          WhatsApp, o botão verde nasce no Contato. Ao preencher a chave Pix e o nome, o QR Code e o
          copia-e-cola nascem na página <em>Apoie</em>.
        </p>
        <blockquote className="versiculo">
          Antes de divulgar o Pix, mande R$ 1,00 para você mesmo pelo QR do site. É o único jeito de
          provar que o dinheiro cai na conta certa.
        </blockquote>

        <h2>Dar acesso de administrador a outra pessoa</h2>
        <p>
          Essa mudança não é feita por esta tela, de propósito: se ela estivesse aqui, qualquer conta
          criada no site poderia se promover sozinha a administrador. O caminho é abrir o painel do
          banco de dados e rodar o comando que está no arquivo <code>sql/03-promover.sql</code> do
          projeto, trocando o e-mail.
        </p>

        <h2>Se algo der errado</h2>
        <ul>
          <li>
            <strong>Salvei e não mudou no site:</strong> confira se a chavinha <em>No ar</em> está
            ligada e recarregue a página do site segurando Ctrl e apertando F5.
          </li>
          <li>
            <strong>Apareceu a tarja amarela MODO PRÉVIA:</strong> o banco de dados ainda não está
            ligado. Nesse modo dá para testar tudo, mas nada é salvo de verdade.
          </li>
          <li>
            <strong>Esqueci a senha:</strong> use “Entrar” no site e o próprio sistema envia a
            redefinição por e-mail. Ninguém, nem a equipe técnica, consegue ver sua senha.
          </li>
        </ul>
      </div>
    </>
  );
}
