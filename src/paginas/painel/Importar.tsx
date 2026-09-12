import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Texto from '../../componentes/Texto';
import { criarArtigo, slugificar } from '../../dados/painel';

/**
 * Importador de texto colado do Notion (ou do Word, ou de qualquer editor).
 *
 * O Notion copia como markdown quando a seleção é de blocos, mas às vezes vem
 * com lixo: numeração dupla, aspas curvas, linhas de metadado. Aqui a limpeza
 * acontece à vista, e o autor vê exatamente o que vai ser publicado.
 */
export default function Importar() {
  const navegar = useNavigate();
  const [cru, setCru] = useState('');
  const [titulo, setTitulo] = useState('');
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro' | 'aviso'; texto: string } | null>(null);

  const limpo = useMemo(() => limpar(cru), [cru]);

  const tituloDetectado = useMemo(() => {
    const l = limpo.split('\n').find((x) => x.trim());
    if (!l) return '';
    return l.replace(/^#{1,6}\s*/, '').trim().slice(0, 140);
  }, [limpo]);

  const palavras = limpo.split(/\s+/).filter(Boolean).length;

  async function importar() {
    const t = (titulo || tituloDetectado).trim();
    if (!t) {
      setAviso({ tom: 'erro', texto: 'Dê um título ao estudo antes de importar.' });
      return;
    }
    if (palavras < 30) {
      setAviso({ tom: 'erro', texto: 'O texto está curto demais para virar estudo.' });
      return;
    }

    // Se a primeira linha virou o título, ela sai do corpo para não repetir.
    const corpo = titulo || !tituloDetectado ? limpo : limpo.split('\n').slice(1).join('\n').trim();

    const r = await criarArtigo({
      slug: slugificar(t),
      titulo: t,
      eixos: ['Geral'],
      resumo: primeiroParagrafo(corpo),
      md: corpo,
      premium: false,
      publicado: false, // entra como rascunho: ninguém publica sem reler
    });

    if (!r.ok) {
      setAviso({ tom: 'erro', texto: `Não importou: ${r.erro}` });
      return;
    }
    setAviso({
      tom: r.previa ? 'aviso' : 'ok',
      texto: r.previa ? 'Importado para o rascunho local (modo prévia).' : 'Importado como rascunho.',
    });
    setTimeout(() => navegar(`/painel/artigo/${slugificar(t)}`), 800);
  }

  return (
    <>
      <header className="painel__cabeca">
        <div>
          <p className="rotulo">Trazer texto de fora</p>
          <h1>Importar do Notion</h1>
        </div>
        <button className="btn btn--ouro" onClick={importar} disabled={!limpo.trim()}>
          Importar como rascunho
        </button>
      </header>

      <p className="recado recado--aviso" style={{ marginBottom: '1.6rem' }}>
        <strong>Os 97 estudos que já estavam no Notion não precisam disso</strong> — eles já foram
        trazidos e estão em Estudos. Esta tela é para texto novo: abra a página no Notion, selecione
        tudo (Ctrl+A), copie (Ctrl+C) e cole no campo abaixo.
      </p>

      {aviso && <p className={`recado recado--${aviso.tom}`} style={{ marginBottom: '1.2rem' }}>{aviso.texto}</p>}

      <div className="editor">
        <div className="editor__campos">
          <label className="campo">
            <span>Título do estudo</span>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder={tituloDetectado || 'Detectado a partir da primeira linha'}
              maxLength={160}
            />
            {tituloDetectado && !titulo && (
              <small className="fosco">Vai usar: “{tituloDetectado}”</small>
            )}
          </label>

          <div className="ficha">
            <div className="ficha__linha">
              <span>Palavras</span>
              <strong className="mono">{palavras.toLocaleString('pt-BR')}</strong>
            </div>
            <div className="ficha__linha">
              <span>Leitura</span>
              <strong className="mono">{Math.max(2, Math.round(palavras / 200))} min</strong>
            </div>
            <div className="ficha__linha">
              <span>Endereço</span>
              <strong className="mono" style={{ fontSize: '0.76rem' }}>
                /artigo/{slugificar(titulo || tituloDetectado) || '…'}
              </strong>
            </div>
          </div>

          <p className="fosco" style={{ fontSize: '0.8rem' }}>
            O estudo entra como <strong>rascunho</strong>, fora do ar. Você revisa, escolhe os eixos
            e só então marca “No ar”.
          </p>
        </div>

        <div className="editor__texto">
          <label className="campo">
            <span>Cole o texto aqui</span>
            <textarea
              className="editor__area"
              value={cru}
              onChange={(e) => setCru(e.target.value)}
              placeholder="Ctrl+V"
            />
          </label>

          {limpo.trim() && (
            <>
              <h2 className="rodape__titulo" style={{ marginTop: '1.4rem' }}>Como vai aparecer</h2>
              <div className="editor__previa">
                <Texto md={limpo} />
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

function limpar(t: string) {
  return t
    .replace(/\r\n?/g, '\n')
    // aspas e travessões tipográficos que o Notion cola
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    // linhas de metadado que vêm junto quando se copia a página inteira
    .replace(/^(Categoria|Criado por|Criado em|Última edição por|Última atualização em|View details)\s*$/gim, '')
    // numeração dupla do tipo "1. 1. texto"
    .replace(/^(\s*)(\d+)\.\s+\2\.\s+/gm, '$1$2. ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function primeiroParagrafo(md: string) {
  for (const l of md.split('\n')) {
    const t = l.replace(/^#{1,6}\s*/, '').replace(/^[-*]\s+/, '').replace(/[*_`]/g, '').trim();
    if (t.length > 60) return t.slice(0, 210) + (t.length > 210 ? '…' : '');
  }
  return '';
}
