import { createAdminClient } from '@/lib/supabase/admin'
import { demoPrices } from '@/lib/data/demo'
import { getLocalSepaPrices, hasLocalSepaPrices } from '@/lib/data/sepa-local'
import type { CurrentPrice } from '@/lib/types'
import { todayArgentina } from '@/lib/utils/date'

export async function getCurrentPrices() {
  const today = todayArgentina()

  if (hasLocalSepaPrices()) {
    return { source: 'sepa-local' as const, data: getLocalSepaPrices(), date: today }
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return { source: 'demo' as const, data: demoPrices, date: today }
  }

  const { data, error } = await supabase.from('v_current_prices').select('*')
  if (error) {
    throw new Error(error.message)
  }

  const prices = (data ?? []) as CurrentPrice[]

  return { source: 'db' as const, data: prices, date: today }
}
