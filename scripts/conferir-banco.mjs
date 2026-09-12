/**
 * Confere, de fora, o que o banco realmente devolve para a chave pública.
 *
 * É o teste que vale: não basta o SQL ter rodado sem erro no editor — o que
 * importa é o que um visitante anônimo consegue (e não consegue) ler.
 *
 *   node scripts/conferir-banco.mjs
 */
import { SUPABASE_URL, SUPABASE_CHAVE_PUBLICAVEL } from '../src/dados/supabase.ts';

const base = process.argv[2] || SUPABASE_URL;
const chave = process.argv[3] || SUPABASE_CHAVE_PUBLICAVEL;

if (!base || !chave) {
  console.error('Sem URL/chave. Passe como argumento ou preencha src/dados/supabase.ts');
  process.exit(1);
}

const cabecalhos = { apikey: chave, Authorization: `Bearer ${chave}` };

const alvos = [
  { nome: 'artigos_publicos', caminho: '/rest/v1/artigos_publicos?select=slug&limit=1', espera: 200, obs: 'catálogo público' },
  { nome: 'eixos_publicos', caminho: '/rest/v1/eixos_publicos?select=slug&limit=1', espera: 200, obs: 'eixos' },
  { nome: 'obras_publicas', caminho: '/rest/v1/obras_publicas?select=slug&limit=1', espera: 200, obs: 'catálogo do Núcleo' },
  { nome: 'config_publica', caminho: '/rest/v1/config_publica?select=chave&limit=1', espera: 200, obs: 'configurações públicas' },
  { nome: 'artigos (crua)', caminho: '/rest/v1/artigos?select=corpo&limit=1', espera: 'vazio-ou-401', obs: 'NÃO pode devolver corpo' },
  { nome: 'perfis (crua)', caminho: '/rest/v1/perfis?select=email&limit=1', espera: 'vazio-ou-401', obs: 'NÃO pode listar gente' },
  { nome: 'mensagens (crua)', caminho: '/rest/v1/mensagens?select=email&limit=1', espera: 'vazio-ou-401', obs: 'NÃO pode ler a caixa' },
];

let falhas = 0;

for (const a of alvos) {
  try {
    const r = await fetch(base + a.caminho, { headers: cabecalhos });
    const corpo = await r.text();
    const vazio = corpo.trim() === '[]';

    let ok;
    if (a.espera === 200) ok = r.status === 200 && !vazio;
    else ok = r.status === 401 || r.status === 403 || r.status === 404 || vazio;

    if (!ok) falhas++;
    console.log(
      `${ok ? 'OK   ' : 'FALHA'} ${a.nome.padEnd(18)} HTTP ${String(r.status).padEnd(4)} ${vazio ? '[]' : corpo.slice(0, 60).replace(/\s+/g, ' ')}   ${a.obs}`
    );
  } catch (e) {
    falhas++;
    console.log(`FALHA ${a.nome.padEnd(18)} ${String(e.message).slice(0, 70)}`);
  }
}

// quantos estudos o público enxerga
try {
  const r = await fetch(base + '/rest/v1/artigos_publicos?select=slug', {
    headers: { ...cabecalhos, Prefer: 'count=exact', Range: '0-0' },
  });
  console.log('\nestudos visíveis ao público: ' + (r.headers.get('content-range') || '?'));
} catch {
  /* silencioso: é informativo, não é prova */
}

console.log(falhas ? `\n${falhas} verificação(ões) falharam.` : '\nTudo conferido.');
process.exitCode = falhas ? 1 : 0;
