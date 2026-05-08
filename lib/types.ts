export type Supplier = {
  id: string
  name: string
  slug: string
  is_global: boolean
  owner_id: string | null
  delivery_days: string[]
  source_type: 'pdf' | 'excel' | 'manual' | 'scraping' | null
  is_active: boolean
}

export type Product = {
  id: string
  name: string
  slug: string
  category: string
  unit: string
}

export type CurrentPrice = {
  price_id: string
  supplier_id: string
  supplier_name: string
  is_global: boolean
  owner_id: string | null
  delivery_days: string[]
  product_id: string
  product_name: string
  category: string
  product_unit: string
  price: number
  brand: string | null
  price_unit: string
  valid_from: string
  parsed_at: string
}

export type UserPurchase = {
  product_id: string
  product_name: string
  current_supplier: string
  current_price: number
  quantity: number
  unit: string
}

export type SavingsRow = {
  product_name: string
  current_supplier: string
  current_price: number
  best_supplier: string
  best_price: number
  saving_pct: number
  saving_abs: number
  delivery_days: string[]
}

export type TotalSavings = {
  current_total: number
  optimized_total: number
  total_saving_pct: number
  total_saving_abs: number
  top_product_name: string | null
  top_product_saving: number | null
}
