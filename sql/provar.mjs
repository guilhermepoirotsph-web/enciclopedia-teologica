/**
 * Prova do esquema em PGlite (Postgres de verdade, em WASM, sem Docker e sem
 * tocar em nuvem nenhuma).
 *
 * O que está sendo provado aqui não é "o SQL não tem erro de digitação" — é que
 * as travas funcionam quando alguém tenta passar por elas:
 *   · o anônimo enxerga os estudos abertos e NÃO enxerga o corpo do pago;
 *   · o corte do artigo pago acontece no servidor, e o texto completo não sai;
 *   · o membro recebe o texto inteiro;
 *   · a tabela `artigos` não é legível direto pelo anônimo;
 *   · um usuário comum não consegue se promover a admin;
 *   · qualquer um manda mensagem pelo formulário, mas ninguém lê a caixa.
 *
 *   node sql/provar.mjs
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const AQUI = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(AQUI, '..');

const { PGlite } = await import(
  'file:///' +
    join(RAIZ, '..', 'beleza-essencia-lovable', 'node_modules', '@electric-sql', 'pglite', 'dist', 'index.js').replace(/\\/g, '/')
);

const db = new PGlite();

/* ---- ambiente que o Supabase dá de graça e o PGlite não tem ---- */
await db.exec(`
  create role anon;
  create role authenticated;
  create schema auth;
  create table auth.users (
    id uuid primary key default gen_random_uuid(),
    email text,
    raw_user_meta_data jsonb default '{}'::jsonb
  );
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('prova.uid', true), '')::uuid;
  $$;
  grant usage on schema public, auth to anon, authenticated;
  grant select on auth.users to anon, authenticated;
`);

/* ---- o esquema real, sem uma linha de diferença (só a extensão, que o
       PGlite não carrega e cujo gen_random_uuid já vem no núcleo) ---- */
const schema = readFileSync(join(AQUI, '01-schema.sql'), 'utf8').replace(
  'create extension if not exists pgcrypto;',
  '-- pgcrypto: nativo no PGlite'
);
await db.exec(schema);
await db.exec(readFileSync(join(AQUI, '02-seed.sql'), 'utf8'));

// Os papéis do site recebem os mesmos GRANTs que o Supabase dá — a partir daqui
// quem decide o que eles enxergam é a RLS, não a falta de permissão.
//
// De propósito SEM `force row level security`: o dono da tabela é isento de RLS
// no Postgres, e é justamente disso que as funções `eh_editor`/`eh_membro`
// (SECURITY DEFINER, rodando como dono) dependem para conseguir ler `perfis`.
// Ligar FORCE aqui deixaria a prova mais severa que a produção e reprovaria um
// esquema correto — sem enfraquecer nada, porque anon e authenticated não são
// donos de tabela nenhuma e continuam submetidos à RLS do mesmo jeito.
await db.exec(`
  grant select, insert, update, delete on all tables in schema public to anon, authenticated;
  grant usage, select on all sequences in schema public to anon, authenticated;
`);

/* ---- personagens ---- */
const uid = async (email, papel, ate = null) => {
  const r = await db.query(`insert into auth.users (email) values ($1) returning id`, [email]);
  const id = r.rows[0].id;
  await db.query(`insert into public.perfis (id, nome, email, papel, membro_ate) values ($1,$2,$3,$4::public.papel_usuario,$5)
                  on conflict (id) do update set papel = excluded.papel, membro_ate = excluded.membro_ate`,
    [id, email.split('@')[0], email, papel, ate]);
  return id;
};

const idAdmin = await uid('eleno@exemplo.com', 'admin');
const idMembro = await uid('membro@exemplo.com', 'membro');
const idLeitor = await uid('leitor@exemplo.com', 'leitor');

/* Um estudo qualquer vira material do Núcleo, para o muro ter o que segurar. */
const alvo = (await db.query(`select slug, corpo from public.artigos order by atualizado_em desc limit 1`)).rows[0];
await db.exec(`update public.artigos set premium = true where slug = '${alvo.slug}'`);

/* ---- utilitários de prova ---- */
const como = async (papel, id, sql, params = []) => {
  await db.exec(`set role ${papel}; select set_config('prova.uid', '${id ?? ''}', false);`);
  try {
    return { ok: true, r: await db.query(sql, params) };
  } catch (e) {
    return { ok: false, erro: e.message };
  } finally {
    // Devolve a sessão ao estado de servidor: papel do dono E sem usuário
    // logado. Deixar o uid pendurado faria a próxima consulta administrativa
    // esbarrar no gatilho anti-promoção, achando que era um leitor tentando se
    // promover.
    await db.exec(`reset role; select set_config('prova.uid', '', false);`);
  }
};

const provas = [];
const prova = (nome, passou, detalhe = '') => provas.push({ nome, passou, detalhe });

/* ---- 1. o anônimo vê o acervo aberto ---- */
{
  const { r } = await como('anon', null, `select count(*)::int as n from public.artigos_publicos`);
  prova('anônimo lê o catálogo público', r.rows[0].n === 97, `${r.rows[0].n} estudos`);
}

/* ---- 2. o corpo do pago NÃO sai pela view ---- */
{
  const { r } = await como('anon', null, `select corpo from public.artigos_publicos where slug = $1`, [alvo.slug]);
  prova('corpo do estudo pago é nulo na view pública', r.rows[0].corpo === null, `corpo = ${r.rows[0].corpo === null ? 'null' : 'VAZOU'}`);
}

/* ---- 3. a tabela crua está fechada para o anônimo ---- */
{
  const { ok, r, erro } = await como('anon', null, `select corpo from public.artigos where slug = $1`, [alvo.slug]);
  const vazio = ok && r.rows.length === 0;
  prova('tabela artigos fechada para o anônimo', vazio || !ok, ok ? `${r.rows.length} linhas` : erro.slice(0, 60));
}

/* ---- 4. o muro corta no servidor ---- */
{
  const { r } = await como('anon', null, `select corpo, cortado from public.ler_artigo($1)`, [alvo.slug]);
  const l = r.rows[0];
  prova(
    'ler_artigo corta o texto do pago para quem não é membro',
    l.cortado === true && l.corpo.length < alvo.corpo.length && l.corpo.length >= 900,
    `${l.corpo.length} de ${alvo.corpo.length} caracteres`
  );
}

/* ---- 5. o membro recebe inteiro ---- */
{
  const { r } = await como('authenticated', idMembro, `select corpo, cortado from public.ler_artigo($1)`, [alvo.slug]);
  const l = r.rows[0];
  prova('membro recebe o texto completo', l.cortado === false && l.corpo.length === alvo.corpo.length, `${l.corpo.length} caracteres`);
}

/* ---- 6. leitor comum NÃO recebe inteiro ---- */
{
  const { r } = await como('authenticated', idLeitor, `select corpo, cortado from public.ler_artigo($1)`, [alvo.slug]);
  prova('leitor logado sem assinatura continua barrado', r.rows[0].cortado === true, `${r.rows[0].corpo.length} caracteres`);
}

/* ---- 7. assinatura vencida não vale ---- */
{
  await db.query(`update public.perfis set membro_ate = now() - interval '1 day' where id = $1`, [idMembro]);
  const { r } = await como('authenticated', idMembro, `select cortado from public.ler_artigo($1)`, [alvo.slug]);
  prova('assinatura vencida perde o acesso', r.rows[0].cortado === true);
  await db.query(`update public.perfis set membro_ate = null where id = $1`, [idMembro]);
}

/* ---- 8. ninguém se promove ---- */
{
  await como('authenticated', idLeitor, `update public.perfis set papel = 'admin' where id = $1`, [idLeitor]);
  const r = await db.query(`select papel from public.perfis where id = $1`, [idLeitor]);
  prova('usuário comum não vira admin sozinho', r.rows[0].papel === 'leitor', `papel = ${r.rows[0].papel}`);
}

/* ---- 9. o admin promove ---- */
{
  await como('authenticated', idAdmin, `update public.perfis set papel = 'membro' where id = $1`, [idLeitor]);
  const r = await db.query(`select papel from public.perfis where id = $1`, [idLeitor]);
  prova('admin consegue promover', r.rows[0].papel === 'membro', `papel = ${r.rows[0].papel}`);
  await db.query(`update public.perfis set papel = 'leitor' where id = $1`, [idLeitor]);
}

/* ---- 10. formulário entra, caixa não sai ---- */
{
  const env = await como('anon', null,
    `insert into public.mensagens (nome, email, assunto, corpo) values ('Visitante','v@exemplo.com','Dúvida','Tenho uma dúvida sobre o estudo.')`);
  const leu = await como('anon', null, `select count(*)::int as n from public.mensagens`);
  prova('visitante consegue enviar mensagem', env.ok, env.ok ? '' : env.erro.slice(0, 70));
  prova('visitante NÃO lê a caixa de entrada', leu.ok && leu.r.rows[0].n === 0, `viu ${leu.ok ? leu.r.rows[0].n : '?'} mensagens`);
}

/* ---- 11. mensagem lixo é barrada pela própria policy ---- */
{
  const r = await como('anon', null, `insert into public.mensagens (nome, email, corpo) values ('x','semarroba','oi')`);
  prova('mensagem sem e-mail válido é recusada', !r.ok, r.ok ? 'PASSOU e não devia' : 'recusada pela policy');
}

/* ---- 12. o corte respeita o parágrafo ---- */
{
  const t = 'a'.repeat(950) + '\n\nsegundo parágrafo';
  const r = await db.query(`select public.previa_texto($1, 900) as p`, [t]);
  prova('o corte cai no fim do parágrafo, não no meio da palavra', r.rows[0].p === 'a'.repeat(950), `${r.rows[0].p.length} caracteres`);
}

/* ---- 13. artigo não publicado não aparece ---- */
{
  await db.exec(`update public.artigos set publicado = false where slug = '${alvo.slug}'`);
  const v = await como('anon', null, `select count(*)::int as n from public.artigos_publicos where slug = $1`, [alvo.slug]);
  const f = await como('anon', null, `select count(*)::int as n from public.ler_artigo($1)`, [alvo.slug]);
  prova('rascunho não aparece para ninguém', v.r.rows[0].n === 0 && f.r.rows[0].n === 0);
  await db.exec(`update public.artigos set publicado = true where slug = '${alvo.slug}'`);
}

/* ---- relatório ---- */
console.log('\nPROVAS DO ESQUEMA\n');
let falhas = 0;
for (const p of provas) {
  if (!p.passou) falhas++;
  console.log(`  ${p.passou ? 'PASSOU ' : 'FALHOU '} ${p.nome}${p.detalhe ? '  (' + p.detalhe + ')' : ''}`);
}
console.log(`\n${provas.length - falhas} de ${provas.length} provas passaram.\n`);
process.exitCode = falhas ? 1 : 0;
