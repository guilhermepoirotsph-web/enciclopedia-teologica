import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Ligação com o Supabase.
 *
 * URL e chave ficam HARDCODADAS aqui de propósito, e não em VITE_*: quando o
 * projeto roda no Lovable Cloud, ele reescreve as variáveis de ambiente
 * apontando para o banco gerenciado dele, e o banco dedicado do Eleno seria
 * ignorado em silêncio. Esta chave é a `publishable` (anon) — ela é pública por
 * natureza e só serve para o que a RLS deixar. A `service_role` NUNCA entra
 * aqui nem em lugar nenhum do front.
 *
 * Enquanto estiver em branco, o site roda inteiro em cima do acervo publicado
 * em /conteudo (97 artigos), e o painel entra em MODO PRÉVIA.
 */
/**
 * Build de PRÉVIA (`VITE_PREVIA=1`): sai sem banco de propósito.
 *
 * Não é economia nem preguiça — é o que permite mostrar o painel para o autor
 * ANTES de existir uma conta de administrador. Sem banco, o site lê o acervo
 * publicado em /conteudo (o mesmo conteúdo) e o painel entra em modo prévia,
 * com tarja permanente avisando que nada é salvo. Aprovado o desenho, o build
 * normal volta a falar com o Supabase.
 */
const previa = import.meta.env.VITE_PREVIA === '1';

export const SUPABASE_URL = previa ? '' : 'https://xssklzwhkxmavtcjorre.supabase.co';
export const SUPABASE_CHAVE_PUBLICAVEL = previa ? '' : 'sb_publishable_33CrvSMfufyae8yPo317RQ_1CeKFJ8r';

export const temBanco = Boolean(SUPABASE_URL && SUPABASE_CHAVE_PUBLICAVEL);

export const supabase: SupabaseClient | null = temBanco
  ? createClient(SUPABASE_URL, SUPABASE_CHAVE_PUBLICAVEL, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
