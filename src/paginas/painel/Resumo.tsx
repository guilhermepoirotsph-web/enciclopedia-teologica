import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { painelArtigos, painelEixos, statusNotion, sincronizarNotion, type RelatorioNotion } from '../../dados/painel';
import { dataCurta } from '../../componentes/CardArtigo';
import { crcConferido } from '../../dados/pix';
import { SITE, temContato } from '../../dados/configuracao';
import { temBanco } from '../../dados/supabase';
import type { Artigo, Eixo } from '../../dados/tipos';

export default function Resumo() {
  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [eixos, setEixos] = useState<Eixo[]>([]);

  useEffect(() => {
    painelArtigos().then(setArtigos).catch(() => {});
    painelEixos().then(setEixos).catch(() => {});
  }, []);

  const publicados = artigos.filter((a) => a.publicado);
  const rascunhos = artigos.filter((a) => !a.publicado);
  const doNucleo = artigos.filter((a) => a.premium);
  const palavras = artigos.reduce((s, a) => s + a.palavras, 0);

  // O que ainda depende de uma ação humana. Configuração pela metade — chave
  // que existe no banco mas não tem campo no painel, ou campo que o site não lê
  // — é o defeito que mais se repete: parece pronto e não muda nada.
  const pendencias = [
    { feito: temBanco, texto: 'Ligar o banco de dados (Supabase) para o painel salvar de verdade' },
    { feito: temContato(SITE.whatsapp), texto: 'Cadastrar o WhatsApp de contato' },
    { feito: temContato(SITE.email), texto: 'Cadastrar o e-mail de contato' },
    { feito: Boolean(SITE.pix.chave), texto: 'Cadastrar a chave Pix para receber apoios' },
    { feito: true, texto: 'Link do livro na Hotmart conferido' },
    { feito: crcConferido(), texto: 'Algoritmo do Pix conferido com o vetor da norma (29B1)' },
  ];

  return (
    <>
      <header className="painel__cabeca">
        <div>
          <p className="rotulo">Painel</p>
          <h1>Como está o acervo</h1>
        </div>
        <Link to="/painel/novo" className="btn btn--ouro">
          Escrever novo estudo
        </Link>
      </header>

      <div className="painel__cartoes">
        <Caixinha valor={publicados.length} rotulo="estudos publicados" />
        <Caixinha valor={rascunhos.length} rotulo="em rascunho" />
        <Caixinha valor={doNucleo.length} rotulo="marcados como Núcleo" />
        <Caixinha valor={eixos.length} rotulo="eixos temáticos" />
        <Caixinha valor={Math.round(palavras / 1000)} rotulo="mil palavras" />
      </div>

      <QuadroNotion />

      <section style={{ marginTop: '2.4rem' }}>
        <h2 className="rodape__titulo">O que ainda falta</h2>
        <ul className="pendencias">
          {pendencias.map((p) => (
            <li key={p.texto} className={p.feito ? 'pendencias--feito' : ''}>
              <span aria-hidden="true">{p.feito ? '✓' : '○'}</span>
              {p.texto}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: '2.4rem' }}>
        <h2 className="rodape__titulo">Mexidos por último</h2>
        <div className="rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th>Estudo</th>
                <th>Eixo</th>
                <th>Revisado</th>
                <th>Situação</th>
              </tr>
            </thead>
            <tbody>
              {artigos.slice(0, 8).map((a) => (
                <tr key={a.slug}>
                  <td>
                    <Link to={`/painel/artigo/${a.slug}`} style={{ color: 'var(--marfim)' }}>
                      {a.titulo}
                    </Link>
                  </td>
                  <td className="fosco">{a.eixos[0]}</td>
                  <td className="mono fosco">{dataCurta(a.atualizado)}</td>
                  <td>
                    {!a.publicado ? (
                      <span className="selo selo--aviso">Rascunho</span>
                    ) : a.premium ? (
                      <span className="selo selo--premium">Núcleo</span>
                    ) : (
                      <span className="selo selo--aberto">Aberto</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

/* ---------------------------------------------------------------- Notion */

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

function resumoNotion(r: RelatorioNotion) {
  const p: string[] = [];
  if (r.novos?.length) p.push(`${r.novos.length} estudo(s) novo(s)`);
  if (r.atualizados?.length) p.push(`${r.atualizados.length} atualizado(s)`);
  if (r.bloqueados?.length) p.push(`${r.bloqueados.length} bloqueado(s) por estar à venda`);
  if (r.despublicados?.length) p.push(`${r.despublicados.length} retirado(s) do site (apagados no Notion)`);
  if (r.faltam) p.push(`faltam ${r.faltam}, que entram na próxima rodada`);
  if (r.erros?.length) p.push(`${r.erros.length} com erro`);
  return p.length ? p.join(', ') : 'nada mudou no Notion';
}

/**
 * O texto dos estudos vem do Notion do autor. A conferência roda sozinha a
 * cada 30 minutos; o botão é para quando ele acabou de escrever e quer ver no
 * site agora. O resultado aparece por extenso — sincronização que "rodou" sem
 * dizer o que fez é o tipo de sucesso silencioso que esconde defeito.
 */
function QuadroNotion() {
  const [st, setSt] = useState<{ em: string | null; relatorio: RelatorioNotion | null } | null>(null);
  const [rodando, setRodando] = useState(false);
  const [msg, setMsg] = useState<{ tom: 'ok' | 'erro' | 'aviso'; texto: string } | null>(null);

  useEffect(() => {
    statusNotion().then(setSt).catch(() => {});
  }, []);

  if (!temBanco) return null;

  async function rodar() {
    setRodando(true);
    setMsg(null);
    try {
      const r = await sincronizarNotion();
      if (r.pulado) setMsg({ tom: 'aviso', texto: r.mensagem || 'Acabou de rodar — tente de novo em 1 minuto.' });
      else if (r.erro) setMsg({ tom: 'erro', texto: r.erro });
      else setMsg({ tom: r.erros?.length ? 'aviso' : 'ok', texto: 'Pronto: ' + resumoNotion(r) + '.' });
      setSt(await statusNotion());
    } catch (e) {
      setMsg({ tom: 'erro', texto: 'Não consegui falar com a sincronização: ' + (e as Error).message });
    } finally {
      setRodando(false);
    }
  }

  const rel = st?.relatorio;
  return (
    <section style={{ marginTop: '2.4rem' }}>
      <h2 className="rodape__titulo">Notion</h2>
      <p className="fosco" style={{ maxWidth: '62ch' }}>
        O texto dos estudos vem da sua base “Central de Artigos” no Notion. O site confere sozinho a
        cada 30 minutos; use o botão quando acabar de escrever e quiser ver no site na hora.
      </p>
      <p style={{ margin: '0.8rem 0' }}>
        Última conferência: <strong>{st?.em ? dataHora(st.em) : 'ainda não rodou'}</strong>
        {rel && !rel.erro ? ` — ${resumoNotion(rel)}` : ''}
      </p>
      {rel?.erro && <p className="recado recado--erro">A última tentativa falhou: {rel.erro}</p>}
      {msg && <p className={`recado recado--${msg.tom}`}>{msg.texto}</p>}
      <button className="btn btn--linha" onClick={rodar} disabled={rodando}>
        {rodando ? 'Conferindo o Notion…' : 'Sincronizar agora'}
      </button>
    </section>
  );
}

function Caixinha({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="caixinha">
      <strong className="mono">{valor.toLocaleString('pt-BR')}</strong>
      <span>{rotulo}</span>
    </div>
  );
}
