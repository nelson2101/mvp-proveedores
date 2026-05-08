import type { CurrentPrice, Product, Supplier, UserPurchase } from '@/lib/types'

export const demoProducts: Product[] = [
  { id: 'aceite', name: 'Aceite', slug: 'aceite', category: 'Despensa', unit: 'litro' },
  { id: 'harina', name: 'Harina', slug: 'harina', category: 'Despensa', unit: 'kg' },
  { id: 'azucar', name: 'Azúcar', slug: 'azucar', category: 'Despensa', unit: 'kg' },
  { id: 'arroz', name: 'Arroz', slug: 'arroz', category: 'Despensa', unit: 'kg' },
  { id: 'fideos', name: 'Fideos', slug: 'fideos', category: 'Despensa', unit: 'kg' },
  { id: 'yerba-mate', name: 'Yerba mate', slug: 'yerba-mate', category: 'Infusiones', unit: 'kg' },
  { id: 'leche', name: 'Leche', slug: 'leche', category: 'Lácteos', unit: 'litro' },
  { id: 'gaseosas', name: 'Gaseosas', slug: 'gaseosas', category: 'Bebidas', unit: 'unidad' },
  { id: 'cerveza', name: 'Cerveza', slug: 'cerveza', category: 'Bebidas', unit: 'unidad' },
  { id: 'agua-mineral', name: 'Agua mineral', slug: 'agua-mineral', category: 'Bebidas', unit: 'litro' },
  { id: 'detergente', name: 'Detergente', slug: 'detergente', category: 'Limpieza', unit: 'litro' },
  { id: 'papel-higienico', name: 'Papel higiénico', slug: 'papel-higienico', category: 'Higiene', unit: 'pack' }
]

export const demoSuppliers: Supplier[] = [
  {
    id: 'nini',
    name: 'Nini Mayorista',
    slug: 'nini',
    is_global: true,
    owner_id: null,
    delivery_days: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'],
    source_type: 'pdf',
    is_active: true
  },
  {
    id: 'vital',
    name: 'Vital',
    slug: 'vital',
    is_global: true,
    owner_id: null,
    delivery_days: ['lunes', 'miércoles', 'viernes'],
    source_type: 'excel',
    is_active: true
  },
  {
    id: 'makro',
    name: 'Makro',
    slug: 'makro',
    is_global: true,
    owner_id: null,
    delivery_days: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    source_type: 'scraping',
    is_active: true
  },
  {
    id: 'yaguar',
    name: 'Yaguar',
    slug: 'yaguar',
    is_global: true,
    owner_id: null,
    delivery_days: ['martes', 'jueves'],
    source_type: 'excel',
    is_active: true
  }
]

const supplierPrice = {
  nini: [1500, 710, 850, 980, 1200, 2100, 930, 1150, 980, 640, 1300, 1800],
  vital: [1380, 690, 790, 1010, 840, 1980, 890, 1100, 1020, 610, 1220, 1690],
  makro: [1350, 720, 800, 995, 900, 2050, 870, 1060, 970, 630, 1260, 1750],
  yaguar: [1420, 740, 820, 980, 930, 2025, 910, 1080, 995, 620, 1210, 1720]
} satisfies Record<string, number[]>

export const demoPrices: CurrentPrice[] = Object.entries(supplierPrice).flatMap(
  ([supplierId, prices]) => {
    const supplier = demoSuppliers.find((item) => item.id === supplierId)!

    return prices.map((price, index) => {
      const product = demoProducts[index]

      return {
        price_id: `${supplierId}-${product.id}`,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        is_global: true,
        owner_id: null,
        delivery_days: supplier.delivery_days,
        product_id: product.id,
        product_name: product.name,
        category: product.category,
        product_unit: product.unit,
        price,
        brand: null,
        price_unit: product.unit,
        valid_from: '2026-05-08',
        parsed_at: '2026-05-08T11:00:00.000Z'
      }
    })
  }
)

export const demoPurchases: UserPurchase[] = [
  {
    product_id: 'fideos',
    product_name: 'Fideos',
    current_supplier: 'Nini Mayorista',
    current_price: 2300,
    quantity: 20,
    unit: 'kg'
  },
  {
    product_id: 'aceite',
    product_name: 'Aceite',
    current_supplier: 'Nini Mayorista',
    current_price: 5600,
    quantity: 18,
    unit: 'litro'
  },
  {
    product_id: 'yerba-mate',
    product_name: 'Yerba mate',
    current_supplier: 'Nini Mayorista',
    current_price: 4200,
    quantity: 12,
    unit: 'kg'
  },
  {
    product_id: 'detergente',
    product_name: 'Detergente',
    current_supplier: 'Nini Mayorista',
    current_price: 3000,
    quantity: 10,
    unit: 'litro'
  }
]
