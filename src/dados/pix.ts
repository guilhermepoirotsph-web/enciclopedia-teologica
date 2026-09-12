/**
 * Pix copia-e-cola gerado no navegador (BR Code EMV, padrão do Banco Central).
 *
 * Sem gateway, sem taxa, sem backend: o dinheiro cai direto na conta do
 * recebedor. O QR é desenhado a partir da mesma string.
 *
 * Aviso honesto que precisa aparecer na tela: o aplicativo do pagador ignora o
 * nome escrito no código e mostra o nome que o banco publicou no DICT. Nenhum
 * site força o nome do recebedor — e isso é proteção contra QR falso, não
 * defeito.
 */

function tlv(id: string, valor: string) {
  return id + String(valor.length).padStart(2, '0') + valor;
}

/** CRC16-CCITT (polinômio 0x1021, inicial 0xFFFF). */
export function crc16(s: string): string {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

const limpar = (s: string, max: number) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9 .\-]/g, '')
    .trim()
    .slice(0, max)
    .toUpperCase();

export function gerarPix(opcoes: {
  chave: string;
  nome: string;
  cidade: string;
  valor?: number;
  descricao?: string;
  identificador?: string;
}): string {
  const { chave, nome, cidade, valor, descricao, identificador = '***' } = opcoes;

  const conta =
    tlv('00', 'BR.GOV.BCB.PIX') +
    tlv('01', chave) +
    (descricao ? tlv('02', limpar(descricao, 40)) : '');

  const corpo =
    tlv('00', '01') +
    tlv('01', '12') + // 12 = reutilizável (pode ser pago mais de uma vez)
    tlv('26', conta) +
    tlv('52', '0000') +
    tlv('53', '986') + // BRL
    (valor && valor > 0 ? tlv('54', valor.toFixed(2)) : '') +
    tlv('58', 'BR') +
    tlv('59', limpar(nome, 25) || 'RECEBEDOR') +
    tlv('60', limpar(cidade, 15) || 'BRASIL') +
    tlv('62', tlv('05', limpar(identificador, 25) || '***'));

  const semCrc = corpo + '6304';
  return semCrc + crc16(semCrc);
}

/**
 * Prova do CRC com o vetor canônico da norma: "123456789" tem CRC16-CCITT 29B1.
 * Fica exportado para o painel poder mostrar "algoritmo conferido" em vez de
 * pedir fé — sucesso silencioso é pior que erro.
 */
export const crcConferido = () => crc16('123456789') === '29B1';
