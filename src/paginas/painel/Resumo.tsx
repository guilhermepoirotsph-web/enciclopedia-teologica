import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { painelArtigos, painelEixos } from '../../dados/painel';
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

function Caixinha({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="caixinha">
      <strong className="mono">{valor.toLocaleString('pt-BR')}</strong>
      <span>{rotulo}</span>
    </div>
  );
}
