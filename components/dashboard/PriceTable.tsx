import { formatCurrency, formatPercent } from '@/lib/utils/format'
import type { SavingsRow } from '@/lib/types'

export function PriceTable({ rows }: { rows: SavingsRow[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white shadow-panel">
      <div className="border-b border-border px-5 py-4">
        <h2 className="font-bold">Detalle por producto</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead className="bg-muted text-slate-700">
            <tr>
              <th className="px-5 py-3 font-semibold">Producto</th>
              <th className="px-5 py-3 font-semibold">Actual</th>
              <th className="px-5 py-3 font-semibold">Mejor precio</th>
              <th className="px-5 py-3 font-semibold">Diferencia</th>
              <th className="px-5 py-3 font-semibold">Entrega</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.product_name} className="border-t border-border">
                <td className="px-5 py-4 font-semibold">{row.product_name}</td>
                <td className="px-5 py-4">
                  {formatCurrency(row.current_price)} · {row.current_supplier}
                </td>
                <td className="px-5 py-4">
                  {formatCurrency(row.best_price)} · {row.best_supplier}
                </td>
                <td className="px-5 py-4 font-bold text-primary">
                  {formatPercent(row.saving_pct)}
                </td>
                <td className="px-5 py-4 capitalize text-slate-600">
                  {row.delivery_days.slice(0, 3).join(', ')}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr>
                <td className="px-5 py-8 text-center text-slate-600" colSpan={5}>
                  No hay oportunidades de ahorro con las compras cargadas.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
