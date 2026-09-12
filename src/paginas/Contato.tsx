import { useState, type FormEvent } from 'react';
import Aparece from '../componentes/Aparece';
import { enviarMensagem, inscrever } from '../dados/fonte';
import { SITE, linkZap, temContato } from '../dados/configuracao';

const ASSUNTOS = [
  'Dúvida sobre um estudo',
  'Correção ou discordância fundamentada',
  'Convite para pregação ou palestra',
  'Sobre o livro',
  'Imprensa ou parceria',
  'Outro assunto',
];

export default function Contato() {
  const [estado, setEstado] = useState<'parado' | 'enviando' | 'ok' | 'erro'>('parado');
  const [erro, setErro] = useState('');
  const [inscricao, setInscricao] = useState<'parado' | 'ok' | 'erro'>('parado');

  const zap = linkZap('Olá! Vim pelo site da Enciclopédia Teológica.');

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);

    // Honeypot: campo invisível que só robô preenche. Se veio preenchido,
    // responde "ok" e não grava nada — o robô não aprende que foi barrado.
    if (String(f.get('site') || '')) {
      setEstado('ok');
      return;
    }

    setEstado('enviando');
    const r = await enviarMensagem({
      nome: String(f.get('nome') || ''),
      email: String(f.get('email') || ''),
      assunto: String(f.get('assunto') || ''),
      corpo: String(f.get('corpo') || ''),
    });

    if (r.ok) {
      setEstado('ok');
      e.currentTarget.reset();
    } else {
      setEstado('erro');
      setErro(
        r.erro === 'sem-banco'
          ? 'O formulário ainda não está ligado ao banco. Use o WhatsApp ou o e-mail enquanto isso.'
          : 'Não consegui enviar agora. Tente de novo em instantes.'
      );
    }
  }

  async function assinarAvisos(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const r = await inscrever(String(f.get('email') || ''), String(f.get('nome') || ''));
    setInscricao(r.ok ? 'ok' : 'erro');
    if (r.ok) e.currentTarget.reset();
  }

  const semCanalDireto = !temContato(SITE.whatsapp) && !temContato(SITE.email);

  return (
    <>
      <header className="cabeca">
        <div className="miolo">
          <p className="rotulo">Fale conosco</p>
          <h1>Contato</h1>
          <p className="olho">
            Dúvida sobre um estudo, correção fundamentada, convite ou assunto de imprensa — tudo
            chega no mesmo lugar. Discordância com argumento é lida com atenção; já mudou texto
            publicado mais de uma vez.
          </p>
        </div>
      </header>

      <section className="secao">
        <div className="miolo contato">
          <Aparece>
            <form className="contato__forma" onSubmit={enviar}>
              <h2 className="rodape__titulo">Enviar mensagem</h2>

              <label className="campo">
                <span>Seu nome</span>
                <input name="nome" required maxLength={90} autoComplete="name" />
              </label>

              <label className="campo">
                <span>E-mail para resposta</span>
                <input name="email" type="email" required maxLength={140} autoComplete="email" />
              </label>

              <label className="campo">
                <span>Assunto</span>
                <select name="assunto" required defaultValue={ASSUNTOS[0]}>
                  {ASSUNTOS.map((a) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
              </label>

              <label className="campo">
                <span>Mensagem</span>
                <textarea name="corpo" required maxLength={4000} />
              </label>

              {/* armadilha para robô — invisível e fora da ordem de tabulação */}
              <label className="desloca" aria-hidden="true">
                Não preencha
                <input name="site" tabIndex={-1} autoComplete="off" />
              </label>

              <button className="btn btn--ouro btn--bloco" disabled={estado === 'enviando'}>
                {estado === 'enviando' ? 'Enviando…' : 'Enviar mensagem'}
              </button>

              {estado === 'ok' && (
                <p className="recado recado--ok" style={{ marginTop: '1rem' }}>
                  Mensagem recebida. A resposta vai para o e-mail informado.
                </p>
              )}
              {estado === 'erro' && (
                <p className="recado recado--erro" style={{ marginTop: '1rem' }}>
                  {erro}
                </p>
              )}
            </form>
          </Aparece>

          <Aparece atraso={90}>
            <div className="contato__canais">
              <h2 className="rodape__titulo">Canais diretos</h2>

              {zap && (
                <a href={zap} target="_blank" rel="noopener noreferrer" className="btn btn--zap btn--bloco">
                  Falar no WhatsApp
                </a>
              )}

              {temContato(SITE.email) && (
                <a href={`mailto:${SITE.email}`} className="btn btn--linha btn--bloco">
                  {SITE.email}
                </a>
              )}

              {semCanalDireto && (
                <p className="recado recado--aviso">
                  WhatsApp e e-mail do autor ainda não foram cadastrados. Assim que entrarem no
                  painel, os botões aparecem aqui sozinhos — por ora, use o formulário ao lado.
                </p>
              )}

              <div id="avise" className="contato__aviso">
                <h3>Receber aviso de novo estudo</h3>
                <p>
                  Um e-mail por publicação, nada além. Sem venda de lista, sem mala direta de
                  terceiro.
                </p>
                <form onSubmit={assinarAvisos}>
                  <label className="campo">
                    <span>Nome</span>
                    <input name="nome" maxLength={90} />
                  </label>
                  <label className="campo">
                    <span>E-mail</span>
                    <input name="email" type="email" required maxLength={140} />
                  </label>
                  <button className="btn btn--linha btn--bloco">Quero receber</button>
                  {inscricao === 'ok' && (
                    <p className="recado recado--ok" style={{ marginTop: '0.8rem' }}>
                      Inscrição registrada.
                    </p>
                  )}
                  {inscricao === 'erro' && (
                    <p className="recado recado--aviso" style={{ marginTop: '0.8rem' }}>
                      A lista de avisos ainda não está ligada ao banco.
                    </p>
                  )}
                </form>
              </div>
            </div>
          </Aparece>
        </div>
      </section>
    </>
  );
}
