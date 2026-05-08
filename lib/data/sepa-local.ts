import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { CurrentPrice, Supplier } from '@/lib/types'

type SepaRow = {
  snapshot_key: string
  fecha_lista: string
  producto_objetivo: string
  id_comercio: string
  id_bandera: string
  id_sucursal: string
  proveedor_razon_social: string
  proveedor_nombre: string
  sucursal_nombre: string
  sucursal_tipo: string
  sucursal_localidad: string
  sucursal_provincia: string
  sucursal_direccion: string
  producto_id: string
  producto_ean: string
  producto_descripcion: string
  producto_marca: string
  producto_presentacion: string
  precio_unitario_con_iva: string
  precio_unitario_sin_iva: string
  unidad_venta: string
  precio_bulto_con_iva: string
  precio_bulto_sin_iva: string
  promo1_precio_con_iva: string
  promo1_leyenda: string
  promo2_precio_con_iva: string
  promo2_leyenda: string
  comercio_ultima_actualizacion: string
  archivo_origen: string
}

const PRODUCT_NAMES: Record<string, { name: string; category: string; unit: string }> = {
  aceite: { name: 'Aceite', category: 'Despensa', unit: 'litro' },
  harina: { name: 'Harina', category: 'Despensa', unit: 'kg' },
  azucar: { name: 'Azúcar', category: 'Despensa', unit: 'kg' },
  arroz: { name: 'Arroz', category: 'Despensa', unit: 'kg' },
  fideos: { name: 'Fideos', category: 'Despensa', unit: 'kg' },
  'yerba-mate': { name: 'Yerba mate', category: 'Infusiones', unit: 'kg' },
  leche: { name: 'Leche', category: 'Lácteos', unit: 'litro' },
  gaseosas: { name: 'Gaseosas', category: 'Bebidas', unit: 'unidad' },
  cerveza: { name: 'Cerveza', category: 'Bebidas', unit: 'unidad' },
  'agua-mineral': { name: 'Agua mineral', category: 'Bebidas', unit: 'litro' },
  detergente: { name: 'Detergente', category: 'Limpieza', unit: 'litro' },
  'papel-higienico': { name: 'Papel higiénico', category: 'Higiene', unit: 'pack' }
}

const LOCAL_CSV = path.join(process.cwd(), 'data', 'sepa_la_plata_productos_mvp.csv')

export function hasLocalSepaPrices() {
  return existsSync(LOCAL_CSV)
}

export function getLocalSepaPrices() {
  const rows = readSepaRows()
  return rows.map(toCurrentPrice).filter((price): price is CurrentPrice => Boolean(price))
}

export function getLocalSepaSuppliers() {
  const rows = readSepaRows()
  const suppliers = new Map<string, Supplier>()

  for (const row of rows) {
    const id = supplierId(row)
    if (suppliers.has(id)) {
      continue
    }

    suppliers.set(id, {
      id,
      name: row.proveedor_nombre || row.proveedor_razon_social,
      slug: slugify(`${row.proveedor_nombre}-${row.id_sucursal}`),
      is_global: true,
      owner_id: null,
      delivery_days: [],
      source_type: 'manual',
      is_active: true
    })
  }

  return [...suppliers.values()].sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

function readSepaRows() {
  if (!hasLocalSepaPrices()) {
    return []
  }

  const content = readFileSync(LOCAL_CSV, 'utf-8')
  const [headerLine, ...lines] = content.split(/\r?\n/).filter(Boolean)
  const headers = parseCsvLine(headerLine)

  return lines.map((line) => {
    const values = parseCsvLine(line)
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']))
  }) as SepaRow[]
}

function toCurrentPrice(row: SepaRow): CurrentPrice | null {
  const product = PRODUCT_NAMES[row.producto_objetivo]
  const price = Number(row.precio_unitario_con_iva)

  if (!product || !Number.isFinite(price) || price <= 0) {
    return null
  }

  return {
    price_id: [
      row.id_comercio,
      row.id_bandera,
      row.id_sucursal,
      row.producto_id,
      row.producto_marca,
      row.precio_unitario_con_iva
    ].join(':'),
    supplier_id: supplierId(row),
    supplier_name: row.proveedor_nombre || row.proveedor_razon_social,
    is_global: true,
    owner_id: null,
    delivery_days: [],
    product_id: row.producto_objetivo,
    product_name: product.name,
    category: product.category,
    product_unit: product.unit,
    price,
    brand: row.producto_marca || null,
    price_unit: row.producto_presentacion || row.unidad_venta || product.unit,
    valid_from: row.fecha_lista,
    parsed_at: row.comercio_ultima_actualizacion || `${row.fecha_lista}T00:00:00-03:00`
  }
}

function supplierId(row: SepaRow) {
  return `${row.id_comercio}-${row.id_bandera}-${row.id_sucursal}`
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function parseCsvLine(line: string) {
  const values: string[] = []
  let current = ''
  let quoted = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const next = line[index + 1]

    if (char === '"' && quoted && next === '"') {
      current += '"'
      index += 1
      continue
    }

    if (char === '"') {
      quoted = !quoted
      continue
    }

    if (char === ',' && !quoted) {
      values.push(current)
      current = ''
      continue
    }

    current += char
  }

  values.push(current)
  return values
}
