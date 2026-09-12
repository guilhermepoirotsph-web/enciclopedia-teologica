import { useEffect, useState } from 'react';
import { painelMembros, painelMensagens, type Membro, type Mensagem } from '../../dados/painel';
import { temBanco } from '../../dados/supabase';

export default function Caixa() {
  const [aba, setAba] = useState<'mensagens' | 'membros'>('mensagens');
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);

  useEffect(() => {
    painelMensagens().then(setMensagens).catch(() => {});
    painelMembros().then(setMembros).catch(() => {});
  }, []);

  return (
    <>
      <header className="painel__cabeca">
        <div>
          <p className="rotulo">Quem chegou</p>
          <h1>Mensagens e membros</h1>
        </div>
      </header>

      <div className="entrada__abas" style={{ maxWidth: 420, marginBottom: '1.6rem' }}>
        <button
          className={aba === 'mensagens' ? 'entrada__aba entrada__aba--ativa' : 'entrada__aba'}
          onClick={() => setAba('mensagens')}
        >
          Mensagens ({mensagens.length})
        </button>
        <button
          className={aba === 'membros' ? 'entrada__aba entrada__aba--ativa' : 'entrada__aba'}
          onClick={() => setAba('membros')}
        >
          Membros ({membros.length})
        </button>
      </div>

      {!temBanco && (
        <p className="recado recado--aviso">
          <strong>Sem banco ligado, não existe caixa de entrada.</strong> As mensagens do formulário
          de contato e os cadastros de membro só passam a existir depois que o Supabase for criado e
          conectado. Esta tela está aqui pronta para receber — vazia é a informação correta, não um
          defeito.
        </p>
      )}

      {temBanco && aba === 'mensagens' && (
        <div className="pilha" style={{ gap: '0.9rem' }}>
          {mensagens.length === 0 && <p className="fosco">Nenhuma mensagem ainda.</p>}
          {mensagens.map((m) => (
            <article key={m.id} className="cartao" style={{ padding: '1.2rem' }}>
              <div className="linha" style={{ justifyContent: 'space-between' }}>
                <strong style={{ color: 'var(--marfim)' }}>{m.nome}</strong>
                <span className="mono fosco" style={{ fontSize: '0.76rem' }}>
                  {new Date(m.criado_em).toLocaleString('pt-BR')}
                </span>
              </div>
              <p className="fosco" style={{ fontSize: '0.82rem', margin: '0.3rem 0 0.8rem' }}>
                {m.email} · {m.assunto}
              </p>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{m.corpo}</p>
              <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.assunto)}`} className="btn btn--linha" style={{ marginTop: '1rem', alignSelf: 'flex-start' }}>
                Responder
              </a>
            </article>
          ))}
        </div>
      )}

      {temBanco && aba === 'membros' && (
        <div className="rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th>Nome</th>
                <th>E-mail</th>
                <th>Papel</th>
                <th>Acesso até</th>
                <th>Entrou em</th>
              </tr>
            </thead>
            <tbody>
              {membros.map((m) => (
                <tr key={m.id}>
                  <td>{m.nome || '—'}</td>
                  <td className="fosco">{m.email}</td>
                  <td>
                    <span className={`selo ${m.papel === 'membro' ? 'selo--premium' : 'selo--aberto'}`}>{m.papel}</span>
                  </td>
                  <td className="mono fosco">
                    {m.membro_ate ? new Date(m.membro_ate).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="mono fosco">{new Date(m.criado_em).toLocaleDateString('pt-BR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="fosco" style={{ fontSize: '0.8rem', padding: '0.9rem' }}>
            Promover alguém a <strong>editor</strong> ou <strong>admin</strong> é feito por comando no
            banco, de propósito: se a promoção coubesse a esta tela, qualquer conta poderia se
            promover sozinha. O passo a passo está em <em>Como usar</em>.
          </p>
        </div>
      )}
    </>
  );
}
