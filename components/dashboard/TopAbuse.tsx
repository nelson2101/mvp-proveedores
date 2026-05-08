import { AlertTriangle } from 'lucide-react'
import { Panel } from '@/components/ui/panel'
import { formatCurrency, formatPercent } from '@/lib/utils/format'
import type { SavingsRow } from '@/lib/types'

export function TopAbuse({ row }: { row?: SavingsRow }) {
  return (
    <Panel>
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase text-accent">
        <AlertTriangle size={18} aria-hidden="true" />
        Mayor diferencia
      </div>
      {row ? (
        <div className="space-y-3">
          <h2 className="text-3xl font-bold">{row.product_name}</h2>
          <p className="text-slate-700">
            Pagás {formatPercent(row.saving_pct)} más caro con {row.current_supplier}.
          </p>
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">
            Mejor opción: <strong>{row.best_supplier}</strong>, {formatCurrency(row.best_price)} vs{' '}
            {formatCurrency(row.current_price)}.
          </p>
        </div>
      ) : (
        <p className="text-slate-600">No hay diferencias de precio con los datos actuales.</p>
      )}
    </Panel>
  )
}
