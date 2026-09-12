import { useEffect, useState } from 'react';
import { lerConfigLocal, salvarConfig } from '../../dados/painel';
import { SITE } from '../../dados/configuracao';
import { crcConferido, gerarPix } from '../../dados/pix';

/**
 * Cada campo aqui tem um consumidor no site. Configuração pela metade — chave
 * no banco sem campo no painel, ou campo que o site não lê — é o defeito que
 * mais se repete, então a coluna "onde aparece" existe para tornar isso óbvio.
 */
const CAMPOS = [
  { chave: 'whatsapp', rotulo: 'WhatsApp (só números, com 55)', dica: 'Ex.: 5512988887777', onde: 'Botão verde no Contato e no rodapé', valor: SITE.whatsapp },
  { chave: 'email', rotulo: 'E-mail de contato', dica: '', onde: 'Botão no Contato', valor: SITE.email },
  { chave: 'instagram', rotulo: 'Instagram (link completo)', dica: '', onde: 'Rodapé', valor: SITE.instagram },
  { chave: 'youtube', rotulo: 'YouTube (link completo)', dica: '', onde: 'Rodapé', valor: SITE.youtube },
  { chave: 'hotmart', rotulo: 'Link do livro na Hotmart', dica: '', onde: 'Página do livro e home', valor: SITE.hotmart },
  { chave: 'pix_chave', rotulo: 'Chave Pix', dica: 'CPF, e-mail, telefone ou chave aleatória', onde: 'QR e copia-e-cola em Apoie', valor: SITE.pix.chave },
  { chave: 'pix_nome', rotulo: 'Nome do recebedor do Pix', dica: 'Como está no banco', onde: 'Apoie', valor: SITE.pix.nome },
  { chave: 'pix_cidade', rotulo: 'Cidade do recebedor', dica: '', onde: 'Apoie', valor: SITE.pix.cidade },
  { chave: 'infinitepay', rotulo: 'InfiniteTag (cartão pela InfinitePay)', dica: 'Só o apelido, sem o endereço', onde: 'Checkout do Núcleo', valor: SITE.infinitepay },
] as const;

export default function Config() {
  const [valores, setValores] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    const local = lerConfigLocal();
    const base: Record<string, string> = {};
    CAMPOS.forEach((c) => (base[c.chave] = local[c.chave] ?? c.valor ?? ''));
    setValores(base);
  }, []);

  async function guardar(chave: string, valor: string) {
    const r = await salvarConfig(chave, valor);
    setAviso(r.ok ? (r.previa ? 'Guardado no rascunho local (modo prévia).' : 'Salvo.') : `Não salvou: ${r.erro}`);
    setTimeout(() => setAviso(''), 3500);
  }

  const pixPronto = Boolean(valores.pix_chave && valores.pix_nome);
  const amostraPix = pixPronto
    ? gerarPix({ chave: valores.pix_chave, nome: valores.pix_nome, cidade: valores.pix_cidade || 'BRASIL', valor: 10, descricao: 'Apoio Enciclopedia' })
    : '';

  return (
    <>
      <header className="painel__cabeca">
        <div>
          <p className="rotulo">Ajustes</p>
          <h1>Configurações</h1>
        </div>
      </header>

      {aviso && <p className="recado recado--ok" style={{ marginBottom: '1.2rem' }}>{aviso}</p>}

      <p className="recado recado--aviso" style={{ marginBottom: '1.8rem' }}>
        Campo em branco <strong>esconde</strong> o botão correspondente no site, em vez de deixar um
        link morto. Preencher é o que faz o botão nascer.
      </p>

      <div className="config">
        {CAMPOS.map((c) => (
          <div key={c.chave} className="config__linha">
            <label className="campo" style={{ margin: 0 }}>
              <span>{c.rotulo}</span>
              <input
                value={valores[c.chave] ?? ''}
                onChange={(e) => setValores({ ...valores, [c.chave]: e.target.value })}
                onBlur={(e) => guardar(c.chave, e.target.value)}
                placeholder={c.dica}
              />
            </label>
            <p className="config__onde">
              <span className="rotulo">onde aparece</span>
              {c.onde}
              {!valores[c.chave] && <em className="config__vazio"> — vazio: escondido no site</em>}
            </p>
          </div>
        ))}
      </div>

      <section style={{ marginTop: '2.4rem' }}>
        <h2 className="rodape__titulo">Conferência do Pix</h2>
        <p className="fosco" style={{ fontSize: '0.86rem' }}>
          Algoritmo do código: <strong>{crcConferido() ? 'conferido com o vetor da norma (29B1)' : 'FALHOU na conferência'}</strong>.
        </p>
        {pixPronto ? (
          <>
            <p className="fosco" style={{ fontSize: '0.86rem' }}>
              Amostra do copia-e-cola de R$ 10,00 com os dados acima:
            </p>
            <code className="config__amostra">{amostraPix}</code>
            <p className="fosco" style={{ fontSize: '0.8rem', marginTop: '0.8rem' }}>
              Antes de divulgar, teste pagando R$ 1,00 para você mesmo — é o único jeito de provar
              que caiu na conta certa.
            </p>
          </>
        ) : (
          <p className="fosco" style={{ fontSize: '0.86rem' }}>
            Preencha chave e nome do recebedor para ver a amostra do código.
          </p>
        )}
      </section>
    </>
  );
}
