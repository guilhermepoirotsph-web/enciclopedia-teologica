import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Texto from '../../componentes/Texto';
import { criarArtigo, painelArtigo, painelEixos, salvarArtigo, slugificar } from '../../dados/painel';
import type { ArtigoCompleto, Eixo } from '../../dados/tipos';

export default function Editor({ novo = false }: { novo?: boolean }) {
  const { slug = '' } = useParams();
  const navegar = useNavigate();

  const [eixos, setEixos] = useState<Eixo[]>([]);
  const [a, setA] = useState<Partial<ArtigoCompleto>>({
    titulo: '',
    resumo: '',
    md: '',
    eixos: [],
    premium: false,
    publicado: false,
    icone: '',
  });
  const [carregando, setCarregando] = useState(!novo);
  const [aviso, setAviso] = useState<{ tom: 'ok' | 'erro' | 'aviso'; texto: string } | null>(null);
  const [vendo, setVendo] = useState<'escrever' | 'previa'>('escrever');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    painelEixos().then(setEixos).catch(() => {});
  }, []);

  useEffect(() => {
    if (novo) return;
    setCarregando(true);
    painelArtigo(slug)
      .then((r) => r && setA(r))
      .finally(() => setCarregando(false));
  }, [slug, novo]);

  const palavras = (a.md ?? '').split(/\s+/).filter(Boolean).length;
  const minutos = Math.max(2, Math.round(palavras / 200));

  async function salvar() {
    if (!a.titulo?.trim()) {
      setAviso({ tom: 'erro', texto: 'O estudo precisa de um título.' });
      return;
    }
    setSalvando(true);

    const r = novo
      ? await criarArtigo({
          slug: slugificar(a.titulo),
          titulo: a.titulo.trim(),
          eixos: a.eixos?.length ? a.eixos : ['Geral'],
          resumo: a.resumo ?? '',
          md: a.md ?? '',
          premium: Boolean(a.premium),
          publicado: Boolean(a.publicado),
        })
      : await salvarArtigo(slug, a);

    setSalvando(false);

    if (!r.ok) {
      setAviso({ tom: 'erro', texto: `Não salvou: ${r.erro}` });
      return;
    }
    setAviso({
      tom: r.previa ? 'aviso' : 'ok',
      texto: r.previa
        ? 'Guardado no rascunho local — modo prévia, não foi para o servidor.'
        : 'Salvo.',
    });
    if (novo) setTimeout(() => navegar(`/painel/artigo/${slugificar(a.titulo!)}`), 700);
  }

  if (carregando) return <p className="fosco">Abrindo o estudo…</p>;

  return (
    <>
      <header className="painel__cabeca">
        <div>
          <p className="rotulo">{novo ? 'Novo estudo' : 'Editando'}</p>
          <h1 style={{ maxWidth: '26ch' }}>{a.titulo || 'Sem título'}</h1>
          <p className="fosco mono" style={{ fontSize: '0.8rem', marginTop: '0.4rem' }}>
            {palavras.toLocaleString('pt-BR')} palavras · {minutos} min de leitura
            {!novo && <> · /artigo/{slug}</>}
          </p>
        </div>
        <div className="linha">
          <Link to="/painel/artigos" className="btn btn--linha">
            Voltar
          </Link>
          <button className="btn btn--ouro" onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </header>

      {aviso && <p className={`recado recado--${aviso.tom}`} style={{ marginBottom: '1.4rem' }}>{aviso.texto}</p>}

      <div className="editor">
        <div className="editor__campos">
          <label className="campo">
            <span>Título</span>
            <input value={a.titulo ?? ''} onChange={(e) => setA({ ...a, titulo: e.target.value })} maxLength={160} />
          </label>

          <label className="campo">
            <span>Resumo (aparece no cartão e no Google)</span>
            <textarea
              value={a.resumo ?? ''}
              onChange={(e) => setA({ ...a, resumo: e.target.value })}
              maxLength={280}
              style={{ minHeight: 88 }}
            />
            <small className="fosco">{(a.resumo ?? '').length}/280</small>
          </label>

          <fieldset className="campo eixos-escolha">
            <span>Eixos temáticos</span>
            <div className="fitas">
              {eixos.map((e) => {
                const marcado = a.eixos?.includes(e.nome);
                return (
                  <button
                    key={e.slug}
                    type="button"
                    className={`fita ${marcado ? 'fita--marcada' : ''}`}
                    onClick={() =>
                      setA({
                        ...a,
                        eixos: marcado
                          ? (a.eixos ?? []).filter((x) => x !== e.nome)
                          : [...(a.eixos ?? []), e.nome],
                      })
                    }
                  >
                    {e.nome}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div className="linha" style={{ gap: '1.6rem', marginBottom: '1.2rem' }}>
            <label className="linha" style={{ gap: '0.6rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(a.publicado)}
                onChange={(e) => setA({ ...a, publicado: e.target.checked })}
                style={{ width: 18, height: 18 }}
              />
              <span>No ar (visível no site)</span>
            </label>
            <label className="linha" style={{ gap: '0.6rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={Boolean(a.premium)}
                onChange={(e) => setA({ ...a, premium: e.target.checked })}
                style={{ width: 18, height: 18 }}
              />
              <span>Conteúdo do Núcleo (pago)</span>
            </label>
          </div>

          {a.premium && (
            <p className="recado recado--aviso" style={{ marginBottom: '1.2rem' }}>
              Marcado como Núcleo: o site passa a mostrar só a abertura do texto para quem não é
              membro. O corte acontece no servidor, não no navegador — o texto inteiro não é enviado
              para quem não pode ler.
            </p>
          )}
        </div>

        <div className="editor__texto">
          <div className="editor__abas">
            <button
              className={vendo === 'escrever' ? 'entrada__aba entrada__aba--ativa' : 'entrada__aba'}
              onClick={() => setVendo('escrever')}
            >
              Escrever
            </button>
            <button
              className={vendo === 'previa' ? 'entrada__aba entrada__aba--ativa' : 'entrada__aba'}
              onClick={() => setVendo('previa')}
            >
              Como vai aparecer
            </button>
          </div>

          {vendo === 'escrever' ? (
            <>
              <textarea
                className="editor__area"
                value={a.md ?? ''}
                onChange={(e) => setA({ ...a, md: e.target.value })}
                spellCheck
              />
              <p className="fosco" style={{ fontSize: '0.78rem', marginTop: '0.6rem' }}>
                Use <code>##</code> para título de seção, <code>###</code> para subtítulo,{' '}
                <code>-</code> para lista e <code>**negrito**</code>. Versículo escrito como{' '}
                <code>João 3:16 — texto</code> vira epígrafe destacada sozinho.
              </p>
            </>
          ) : (
            <div className="editor__previa">
              <Texto md={a.md ?? ''} />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
