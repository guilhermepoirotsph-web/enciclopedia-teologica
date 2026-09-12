import { useEffect, useState } from 'react';
import { painelObras, salvarObra } from '../../dados/painel';
import type { Obra } from '../../dados/tipos';

export default function NucleoAdmin() {
  const [obras, setObras] = useState<Obra[]>([]);
  const [aviso, setAviso] = useState('');

  const recarregar = () => painelObras().then(setObras).catch(() => {});
  useEffect(() => {
    recarregar();
  }, []);

  async function guardar(o: Obra, campos: Partial<Obra>) {
    const r = await salvarObra(o.slug, campos);
    setAviso(r.ok ? (r.previa ? 'Guardado no rascunho local (modo prévia).' : 'Salvo.') : `Não salvou: ${r.erro}`);
    setObras((lista) => lista.map((x) => (x.slug === o.slug ? { ...x, ...campos } : x)));
    setTimeout(() => setAviso(''), 3500);
  }

  return (
    <>
      <header className="painel__cabeca">
        <div>
          <p className="rotulo">Conteúdo pago</p>
          <h1>Núcleo de Estudos</h1>
        </div>
      </header>

      <p className="recado recado--aviso" style={{ marginBottom: '1.6rem' }}>
        <strong>Como funciona a tarja &ldquo;em preparação&rdquo;.</strong> Enquanto uma obra estiver
        marcada como exemplo, o site mostra ela com a tarja e <em>sem</em> botão de compra. Assim que
        o conteúdo existir de verdade, desmarque o exemplo e coloque o link de venda — só aí o botão
        aparece. É o que impede o site de anunciar produto que ainda não existe.
      </p>

      {aviso && <p className="recado recado--ok" style={{ marginBottom: '1.2rem' }}>{aviso}</p>}

      <div className="pilha" style={{ gap: '1.2rem' }}>
        {obras.map((o) => (
          <div key={o.slug} className="obra-edicao">
            <div className="obra-edicao__cabeca">
              <div>
                <span className="cartao__eixo">{o.tipo}</span>
                <h2 style={{ fontSize: '1.4rem' }}>{o.titulo}</h2>
                <p className="fosco" style={{ fontSize: '0.86rem', margin: '0.3rem 0 0' }}>
                  {o.subtitulo}
                </p>
              </div>
              <div className="linha">
                {o.exemplo ? (
                  <span className="selo selo--aviso">Em preparação</span>
                ) : (
                  <span className="selo selo--aberto">No ar</span>
                )}
              </div>
            </div>

            <label className="campo">
              <span>Descrição na página</span>
              <textarea
                defaultValue={o.descricao}
                onBlur={(e) => e.target.value !== o.descricao && guardar(o, { descricao: e.target.value })}
                style={{ minHeight: 92 }}
              />
            </label>

            <label className="campo">
              <span>Link de compra (Hotmart, InfinitePay, etc.)</span>
              <input
                defaultValue={o.linkExterno ?? ''}
                placeholder="https://…"
                onBlur={(e) => e.target.value !== (o.linkExterno ?? '') && guardar(o, { linkExterno: e.target.value || null })}
              />
            </label>

            <div className="linha" style={{ gap: '1.6rem' }}>
              <label className="linha" style={{ gap: '0.6rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={!o.exemplo}
                  onChange={(e) => guardar(o, { exemplo: !e.target.checked })}
                  style={{ width: 18, height: 18 }}
                />
                <span>Conteúdo pronto (tira a tarja e libera o botão)</span>
              </label>
              <label className="linha" style={{ gap: '0.6rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={o.ativo}
                  onChange={(e) => guardar(o, { ativo: e.target.checked })}
                  style={{ width: 18, height: 18 }}
                />
                <span>Aparece no site</span>
              </label>
            </div>

            {!o.exemplo && !o.linkExterno && (
              <p className="recado recado--erro" style={{ marginTop: '0.8rem' }}>
                Marcada como pronta, mas sem link de compra — o botão não tem para onde levar.
              </p>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
