import type { OrderItem } from '../../services/orders.service'
import { formatPrice } from '../../utils/format'

export function OrderItemsTable({ items, total }: { items: OrderItem[]; total: number }) {
  return (
    <div className="tp-table-wrap">
      <table className="tp-table">
        <thead>
          <tr>
            <th scope="col">Produit</th>
            <th scope="col" className="tp-num">Qté</th>
            <th scope="col" className="tp-num">Prix unitaire</th>
            <th scope="col" className="tp-num">Sous-total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.product_name}</td>
              <td className="tp-num">{item.quantity}</td>
              <td className="tp-num">{formatPrice(item.unit_price)}</td>
              <td className="tp-num">{formatPrice(Number(item.unit_price) * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={3} style={{ paddingTop: 'var(--space-3)' }}>Total</th>
            <td className="tp-num" style={{ fontWeight: 700 }}>{formatPrice(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
