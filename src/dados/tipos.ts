export type Artigo = {
  slug: string;
  titulo: string;
  icone: string;
  eixos: string[];
  /** categoria exatamente como o Eleno escreveu no Notion, antes da normalização */
  eixoOrigem?: string;
  resumo: string;
  criado: string | null;
  atualizado: string | null;
  palavras: number;
  minutos: number;
  referencias: string[];
  premium: boolean;
  publicado: boolean;
  capa?: string | null;
};

export type ArtigoCompleto = Artigo & {
  md: string;
  /** true quando o corpo veio cortado porque o artigo é do Núcleo */
  cortado?: boolean;
};

export type Eixo = {
  slug: string;
  nome: string;
  descricao: string;
  total: number;
};

export type Obra = {
  slug: string;
  titulo: string;
  subtitulo: string;
  descricao: string;
  capa: string | null;
  tipo: 'livro' | 'serie' | 'curso' | 'plano';
  precoCentavos: number | null;
  linkExterno: string | null;
  /** marcado como exemplo enquanto o Eleno não publica o conteúdo de verdade */
  exemplo: boolean;
  ativo: boolean;
  ordem: number;
};

export type Papel = 'leitor' | 'membro' | 'editor' | 'admin';

export type Perfil = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  ativo: boolean;
  membroAte: string | null;
};
