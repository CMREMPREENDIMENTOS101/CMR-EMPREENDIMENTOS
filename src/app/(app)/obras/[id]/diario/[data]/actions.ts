'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { DiarioStatus, ClimaTipo, TurnoTipo, EquipStatus, OcorrClasse } from '@/types/supabase'

export interface DiarioPayload {
  obraId: string
  data: string
  status: DiarioStatus
  clima_manha: ClimaTipo | null
  clima_tarde: ClimaTipo | null
  turno: TurnoTipo | null
  observacoes: string
  mao_de_obra: Array<{
    funcao: string
    quantidade: number
    horas: number
    subempreiteira_nome: string
    subempreiteira_cnpj: string
  }>
  equipamentos: Array<{
    nome: string
    status: EquipStatus
    horas_uso: number
  }>
  servicos: Array<{
    descricao: string
    etapa_id: string | null
    percentual_conclusao: number
    localizacao: string
  }>
  materiais: Array<{
    item: string
    quantidade: number | null
    unidade: string
    fornecedor: string
    nota_fiscal: string
  }>
  ocorrencias: Array<{
    descricao: string
    classe: OcorrClasse
  }>
}

export async function salvarDiario(payload: DiarioPayload) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const { data: diario, error: diarioError } = await supabase
    .from('diarios')
    .upsert(
      {
        obra_id: payload.obraId,
        data: payload.data,
        clima_manha: payload.clima_manha,
        clima_tarde: payload.clima_tarde,
        turno: payload.turno,
        observacoes: payload.observacoes || null,
        status: payload.status,
        preenchido_por: user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'obra_id,data' }
    )
    .select('id')
    .single()

  if (diarioError || !diario) {
    return { error: diarioError?.message ?? 'Erro ao salvar diário' }
  }

  const diarioId = diario.id

  const [
    { error: e1 },
    { error: e2 },
    { error: e3 },
    { error: e4 },
    { error: e5 },
  ] = await Promise.all([
    supabase.from('diario_mao_de_obra').delete().eq('diario_id', diarioId),
    supabase.from('diario_equipamentos').delete().eq('diario_id', diarioId),
    supabase.from('diario_servicos').delete().eq('diario_id', diarioId),
    supabase.from('diario_materiais').delete().eq('diario_id', diarioId),
    supabase.from('diario_ocorrencias').delete().eq('diario_id', diarioId),
  ])

  if (e1 || e2 || e3 || e4 || e5) {
    return { error: 'Erro ao limpar registros anteriores' }
  }

  const inserts: PromiseLike<{ error: unknown }>[] = []

  if (payload.mao_de_obra.length > 0) {
    inserts.push(
      supabase.from('diario_mao_de_obra').insert(
        payload.mao_de_obra.map((r) => ({ ...r, diario_id: diarioId }))
      )
    )
  }
  if (payload.equipamentos.length > 0) {
    inserts.push(
      supabase.from('diario_equipamentos').insert(
        payload.equipamentos.map((r) => ({ ...r, diario_id: diarioId }))
      )
    )
  }
  if (payload.servicos.length > 0) {
    inserts.push(
      supabase.from('diario_servicos').insert(
        payload.servicos.map((r) => ({ ...r, diario_id: diarioId }))
      )
    )
  }
  if (payload.materiais.length > 0) {
    inserts.push(
      supabase.from('diario_materiais').insert(
        payload.materiais.map((r) => ({ ...r, diario_id: diarioId }))
      )
    )
  }
  if (payload.ocorrencias.length > 0) {
    inserts.push(
      supabase.from('diario_ocorrencias').insert(
        payload.ocorrencias.map((r) => ({ ...r, diario_id: diarioId }))
      )
    )
  }

  if (inserts.length > 0) {
    const results = await Promise.all(inserts)
    const insertError = results.find((r) => r.error)
    if (insertError) return { error: 'Erro ao salvar itens do diário' }
  }

  revalidatePath(`/obras/${payload.obraId}/diario`)
  return { success: true, diarioId }
}
