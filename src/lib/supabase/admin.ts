import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Cliente com service_role — NUNCA expor ao browser
// Usar apenas em Route Handlers e Server Actions
export function createAdminSupabaseClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
