import { createClient } from '@supabase/supabase-js'
import { hasSupabaseServerEnv } from '@/lib/env'

export function createAdminClient() {
  if (!hasSupabaseServerEnv()) {
    return null
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}
