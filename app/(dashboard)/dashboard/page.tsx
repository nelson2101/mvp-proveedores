import Link from 'next/link'
import { SelectedProductsReport } from '@/components/dashboard/SelectedProductsReport'
import { getCurrentPrices } from '@/lib/repositories/prices.repo'
import { formatDate } from '@/lib/utils/format'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const { data: prices, source, date } = await getCurrentPrices()
  const sourceLabel =
    source === 'sepa-local' ? 'SEPA La Plata filtrado' : source === 'demo' ? 'modo demo' : source

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-600">
            Datos: {sourceLabel}
          </p>
          <h1 className="text-3xl font-bold">Almacén Don Pedro</h1>
          <p className="mt-1 text-slate-600">Precios al {formatDate(date)}</p>
        </div>
      </div>

      <div className="mt-5">
        <SelectedProductsReport prices={prices} />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          className="focus-ring inline-flex h-10 items-center justify-center rounded-md border border-border bg-white px-4 text-sm font-semibold transition hover:bg-muted"
          href="/onboarding"
        >
          Seleccionar productos y cantidades
        </Link>
      </div>
    </main>
  )
}
