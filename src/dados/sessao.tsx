import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { supabase, temBanco } from './supabase';
import type { Papel, Perfil } from './tipos';

/**
 * Sessão do leitor.
 *
 * Com banco: Supabase Auth + tabela `perfis`. O papel NUNCA é lido do
 * localStorage nem do metadata do usuário — vem da tabela, que só um admin
 * consegue alterar. Esconder um botão não protege nada; quem protege é a RLS.
 *
 * Sem banco: MODO PRÉVIA. Dá para percorrer o painel inteiro para aprovar o
 * layout, com tarja permanente na tela dizendo que nada está sendo salvo no
 * servidor. Nenhuma senha real passa por aqui.
 */

type Contexto = {
  perfil: Perfil | null;
  carregando: boolean;
  modoPrevia: boolean;
  ehAdmin: boolean;
  ehMembro: boolean;
  entrar: (email: string, senha: string) => Promise<{ ok: boolean; erro?: string }>;
  cadastrar: (nome: string, email: string, senha: string) => Promise<{ ok: boolean; erro?: string }>;
  entrarPrevia: (papel: Papel) => void;
  sair: () => Promise<void>;
};

const Ctx = createContext<Contexto | null>(null);
const CHAVE_PREVIA = 'eta.previa.papel';

export function ProvedorSessao({ children }: { children: ReactNode }) {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    if (!temBanco) {
      const papel = localStorage.getItem(CHAVE_PREVIA) as Papel | null;
      if (papel) setPerfil(perfilDePrevia(papel));
      setCarregando(false);
      return;
    }

    let vivo = true;
    const carregar = async (uid: string | undefined) => {
      if (!uid) {
        if (vivo) setPerfil(null);
        return;
      }
      const { data } = await supabase!
        .from('perfis')
        .select('id,nome,email,papel,ativo,membro_ate')
        .eq('id', uid)
        .maybeSingle();
      if (!vivo) return;
      setPerfil(
        data
          ? {
              id: data.id,
              nome: data.nome ?? '',
              email: data.email ?? '',
              papel: (data.papel as Papel) ?? 'leitor',
              ativo: Boolean(data.ativo),
              membroAte: data.membro_ate ?? null,
            }
          : null
      );
    };

    supabase!.auth.getSession().then(({ data }) => {
      carregar(data.session?.user.id).finally(() => vivo && setCarregando(false));
    });

    const { data: sub } = supabase!.auth.onAuthStateChange((_e, sessao) => {
      carregar(sessao?.user.id);
    });

    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const valor = useMemo<Contexto>(() => {
    const membroValido =
      perfil?.papel === 'admin' ||
      perfil?.papel === 'editor' ||
      (perfil?.papel === 'membro' && (!perfil.membroAte || new Date(perfil.membroAte) > new Date()));

    return {
      perfil,
      carregando,
      modoPrevia: !temBanco,
      ehAdmin: perfil?.papel === 'admin' || perfil?.papel === 'editor',
      ehMembro: Boolean(membroValido),

      async entrar(email, senha) {
        if (!temBanco) return { ok: false, erro: 'O banco ainda não está ligado. Use o acesso de prévia.' };
        const { error } = await supabase!.auth.signInWithPassword({ email, password: senha });
        return error ? { ok: false, erro: traduzir(error.message) } : { ok: true };
      },

      async cadastrar(nome, email, senha) {
        if (!temBanco) return { ok: false, erro: 'O banco ainda não está ligado.' };
        const { error } = await supabase!.auth.signUp({
          email,
          password: senha,
          options: { data: { nome } },
        });
        return error ? { ok: false, erro: traduzir(error.message) } : { ok: true };
      },

      entrarPrevia(papel) {
        localStorage.setItem(CHAVE_PREVIA, papel);
        setPerfil(perfilDePrevia(papel));
      },

      async sair() {
        localStorage.removeItem(CHAVE_PREVIA);
        if (temBanco) await supabase!.auth.signOut();
        setPerfil(null);
      },
    };
  }, [perfil, carregando]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useSessao() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useSessao precisa estar dentro de <ProvedorSessao>');
  return c;
}

function perfilDePrevia(papel: Papel): Perfil {
  return {
    id: 'previa',
    nome: papel === 'admin' ? 'Eleno Gutemberg (prévia)' : 'Leitor de prévia',
    email: 'previa@local',
    papel,
    ativo: true,
    membroAte: null,
  };
}

function traduzir(msg: string) {
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha não conferem.';
  if (/Email not confirmed/i.test(msg)) return 'Confirme o e-mail antes de entrar.';
  if (/already registered/i.test(msg)) return 'Esse e-mail já tem cadastro.';
  if (/Password should be/i.test(msg)) return 'A senha precisa de pelo menos 6 caracteres.';
  return msg;
}
