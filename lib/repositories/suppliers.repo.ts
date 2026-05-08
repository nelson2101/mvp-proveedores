import { demoSuppliers } from '@/lib/data/demo'
import { getLocalSepaSuppliers, hasLocalSepaPrices } from '@/lib/data/sepa-local'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Supplier } from '@/lib/types'

export async function getSuppliers() {
  if (hasLocalSepaPrices()) {
    return getLocalSepaSuppliers()
  }

  const supabase = createAdminClient()
  if (!supabase) {
    return demoSuppliers
  }

  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('is_active', true)
    .order('is_global', { ascending: false })
    .order('name')

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Supplier[]
}
