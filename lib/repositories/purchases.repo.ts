import { demoPurchases } from '@/lib/data/demo'
import { createAdminClient } from '@/lib/supabase/admin'
import type { UserPurchase } from '@/lib/types'

type PurchaseRow = {
  product_id: string
  current_price: number | string
  quantity: number | string
  unit: string
  products: { name: string }
  suppliers: { name: string }
}

export async function getUserPurchases(userId?: string) {
  const supabase = createAdminClient()

  if (!supabase || !userId) {
    return demoPurchases
  }

  const { data, error } = await supabase
    .from('user_purchases')
    .select(
      `
      product_id,
      current_price,
      quantity,
      unit,
      products!inner(name),
      suppliers!inner(name)
    `
    )
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }

  return ((data ?? []) as unknown as PurchaseRow[]).map((row): UserPurchase => ({
    product_id: row.product_id,
    product_name: row.products.name,
    current_supplier: row.suppliers.name,
    current_price: Number(row.current_price),
    quantity: Number(row.quantity),
    unit: row.unit
  }))
}
