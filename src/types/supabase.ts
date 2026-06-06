export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ============================================================
// ENUMS
// ============================================================
export type PerfilGlobal = 'admin' | 'engenheiro' | 'encarregado'
export type ObraStatus = 'em_andamento' | 'paralisada' | 'concluida'
export type ObraTipo = 'residencial' | 'comercial' | 'industrial'
export type DiarioStatus = 'rascunho' | 'preenchido' | 'aprovado'
export type ClimaTipo = 'sol' | 'nublado' | 'chuva' | 'garoa'
export type TurnoTipo = 'manha' | 'tarde' | 'noturno'
export type EquipStatus = 'ativo' | 'parado' | 'manutencao'
export type OcorrClasse = 'informativa' | 'alerta' | 'critica'

// ============================================================
// DATABASE (estrutura exigida pelo @supabase/supabase-js v2)
// ============================================================
export interface Database {
  public: {
    Tables: {
      empresas: {
        Row: {
          id: string
          razao_social: string
          cnpj: string | null
          logo_url: string | null
          created_at: string
        }
        Insert: {
          id?: string
          razao_social: string
          cnpj?: string | null
          logo_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          razao_social?: string
          cnpj?: string | null
          logo_url?: string | null
          created_at?: string
        }
        Relationships: []
      }
      usuarios: {
        Row: {
          id: string
          nome: string
          email: string
          perfil: PerfilGlobal
          empresa_id: string | null
          ativo: boolean
          created_at: string
        }
        Insert: {
          id: string
          nome: string
          email: string
          perfil?: PerfilGlobal
          empresa_id?: string | null
          ativo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          email?: string
          perfil?: PerfilGlobal
          empresa_id?: string | null
          ativo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      obras: {
        Row: {
          id: string
          nome: string
          endereco: string | null
          tipo: ObraTipo | null
          data_inicio: string | null
          previsao_termino: string | null
          responsavel_tecnico: string | null
          art_rrt: string | null
          numero_contrato: string | null
          status: ObraStatus
          capa_url: string | null
          empresa_id: string | null
          orcamento_id: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          nome: string
          endereco?: string | null
          tipo?: ObraTipo | null
          data_inicio?: string | null
          previsao_termino?: string | null
          responsavel_tecnico?: string | null
          art_rrt?: string | null
          numero_contrato?: string | null
          status?: ObraStatus
          capa_url?: string | null
          empresa_id?: string | null
          orcamento_id?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          nome?: string
          endereco?: string | null
          tipo?: ObraTipo | null
          data_inicio?: string | null
          previsao_termino?: string | null
          responsavel_tecnico?: string | null
          art_rrt?: string | null
          numero_contrato?: string | null
          status?: ObraStatus
          capa_url?: string | null
          empresa_id?: string | null
          orcamento_id?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      obra_membros: {
        Row: {
          obra_id: string
          usuario_id: string
        }
        Insert: {
          obra_id: string
          usuario_id: string
        }
        Update: {
          obra_id?: string
          usuario_id?: string
        }
        Relationships: []
      }
      etapas: {
        Row: {
          id: string
          obra_id: string
          nome: string
          etapa_pai_id: string | null
          data_inicio_prev: string | null
          data_fim_prev: string | null
          data_inicio_real: string | null
          data_fim_real: string | null
          percentual_previsto: number
          percentual_real: number
          ordem: number
          created_at: string
        }
        Insert: {
          id?: string
          obra_id: string
          nome: string
          etapa_pai_id?: string | null
          data_inicio_prev?: string | null
          data_fim_prev?: string | null
          data_inicio_real?: string | null
          data_fim_real?: string | null
          percentual_previsto?: number
          percentual_real?: number
          ordem?: number
          created_at?: string
        }
        Update: {
          id?: string
          obra_id?: string
          nome?: string
          etapa_pai_id?: string | null
          data_inicio_prev?: string | null
          data_fim_prev?: string | null
          data_inicio_real?: string | null
          data_fim_real?: string | null
          percentual_previsto?: number
          percentual_real?: number
          ordem?: number
          created_at?: string
        }
        Relationships: []
      }
      diarios: {
        Row: {
          id: string
          obra_id: string
          data: string
          clima_manha: ClimaTipo | null
          clima_tarde: ClimaTipo | null
          turno: TurnoTipo | null
          observacoes: string | null
          status: DiarioStatus
          preenchido_por: string | null
          aprovado_por: string | null
          aprovado_em: string | null
          assinatura_ip: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          obra_id: string
          data: string
          clima_manha?: ClimaTipo | null
          clima_tarde?: ClimaTipo | null
          turno?: TurnoTipo | null
          observacoes?: string | null
          status?: DiarioStatus
          preenchido_por?: string | null
          aprovado_por?: string | null
          aprovado_em?: string | null
          assinatura_ip?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          obra_id?: string
          data?: string
          clima_manha?: ClimaTipo | null
          clima_tarde?: ClimaTipo | null
          turno?: TurnoTipo | null
          observacoes?: string | null
          status?: DiarioStatus
          preenchido_por?: string | null
          aprovado_por?: string | null
          aprovado_em?: string | null
          assinatura_ip?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      diario_mao_de_obra: {
        Row: {
          id: string
          diario_id: string
          funcao: string
          quantidade: number
          horas: number
          subempreiteira_nome: string | null
          subempreiteira_cnpj: string | null
          funcionario_id: string | null
        }
        Insert: {
          id?: string
          diario_id: string
          funcao: string
          quantidade?: number
          horas?: number
          subempreiteira_nome?: string | null
          subempreiteira_cnpj?: string | null
          funcionario_id?: string | null
        }
        Update: {
          id?: string
          diario_id?: string
          funcao?: string
          quantidade?: number
          horas?: number
          subempreiteira_nome?: string | null
          subempreiteira_cnpj?: string | null
          funcionario_id?: string | null
        }
        Relationships: []
      }
      diario_equipamentos: {
        Row: {
          id: string
          diario_id: string
          nome: string
          status: EquipStatus
          horas_uso: number
        }
        Insert: {
          id?: string
          diario_id: string
          nome: string
          status?: EquipStatus
          horas_uso?: number
        }
        Update: {
          id?: string
          diario_id?: string
          nome?: string
          status?: EquipStatus
          horas_uso?: number
        }
        Relationships: []
      }
      diario_servicos: {
        Row: {
          id: string
          diario_id: string
          descricao: string
          etapa_id: string | null
          percentual_conclusao: number
          localizacao: string | null
        }
        Insert: {
          id?: string
          diario_id: string
          descricao: string
          etapa_id?: string | null
          percentual_conclusao?: number
          localizacao?: string | null
        }
        Update: {
          id?: string
          diario_id?: string
          descricao?: string
          etapa_id?: string | null
          percentual_conclusao?: number
          localizacao?: string | null
        }
        Relationships: []
      }
      diario_materiais: {
        Row: {
          id: string
          diario_id: string
          item: string
          quantidade: number | null
          unidade: string | null
          fornecedor: string | null
          nota_fiscal: string | null
        }
        Insert: {
          id?: string
          diario_id: string
          item: string
          quantidade?: number | null
          unidade?: string | null
          fornecedor?: string | null
          nota_fiscal?: string | null
        }
        Update: {
          id?: string
          diario_id?: string
          item?: string
          quantidade?: number | null
          unidade?: string | null
          fornecedor?: string | null
          nota_fiscal?: string | null
        }
        Relationships: []
      }
      diario_ocorrencias: {
        Row: {
          id: string
          diario_id: string
          descricao: string
          classe: OcorrClasse
        }
        Insert: {
          id?: string
          diario_id: string
          descricao: string
          classe?: OcorrClasse
        }
        Update: {
          id?: string
          diario_id?: string
          descricao?: string
          classe?: OcorrClasse
        }
        Relationships: []
      }
      diario_fotos: {
        Row: {
          id: string
          diario_id: string
          storage_path: string
          legenda: string | null
          etapa_id: string | null
          ordem: number
          created_at: string
        }
        Insert: {
          id?: string
          diario_id: string
          storage_path: string
          legenda?: string | null
          etapa_id?: string | null
          ordem?: number
          created_at?: string
        }
        Update: {
          id?: string
          diario_id?: string
          storage_path?: string
          legenda?: string | null
          etapa_id?: string | null
          ordem?: number
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      meu_perfil: {
        Args: Record<PropertyKey, never>
        Returns: PerfilGlobal
      }
      sou_membro: {
        Args: { p_obra_id: string }
        Returns: boolean
      }
      aprovar_diario: {
        Args: { p_diario_id: string; p_ip: string }
        Returns: undefined
      }
    }
    Enums: {
      perfil_global: PerfilGlobal
      obra_status: ObraStatus
      obra_tipo: ObraTipo
      diario_status: DiarioStatus
      clima_tipo: ClimaTipo
      turno_tipo: TurnoTipo
      equip_status: EquipStatus
      ocorr_classe: OcorrClasse
    }
  }
}

// ============================================================
// HELPER TYPES — rows prontos para uso nos componentes
// ============================================================
type Tables = Database['public']['Tables']

export type Empresa = Tables['empresas']['Row']
export type Usuario = Tables['usuarios']['Row']
export type Obra = Tables['obras']['Row']
export type ObraMembro = Tables['obra_membros']['Row']
export type Etapa = Tables['etapas']['Row']
export type Diario = Tables['diarios']['Row']
export type DiarioMaoDeObra = Tables['diario_mao_de_obra']['Row']
export type DiarioEquipamento = Tables['diario_equipamentos']['Row']
export type DiarioServico = Tables['diario_servicos']['Row']
export type DiarioMaterial = Tables['diario_materiais']['Row']
export type DiarioOcorrencia = Tables['diario_ocorrencias']['Row']
export type DiarioFoto = Tables['diario_fotos']['Row']
