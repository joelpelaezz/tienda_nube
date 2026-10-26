import { getCoupons } from './actions';
import { formatPrice } from '@/lib/utils/format';
import CouponForm from './CouponForm';
import CouponRowActions from './CouponRowActions';
import { isCouponExpired, isCouponNotStarted } from '@/lib/coupon-validation';

// C4-TRACE: admin status uses the same inclusive date boundaries as checkout validation.

export const dynamic = 'force-dynamic';

function toDateInput(value: Date | null) {
  if (!value) return '';
  return value.toISOString().slice(0, 10);
}

export default async function DescuentosPage() {
  const coupons = await getCoupons();

  return (
    <div>
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Descuentos</h1>
          <p className="admin-page-subtitle">
            Códigos de descuento que los clientes ingresan en el checkout.
          </p>
        </div>
        <div className="admin-page-header-actions">
          <CouponForm />
        </div>
      </div>

      <div className="admin-card">
        {coupons.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">🏷️</div>
            <div className="admin-empty-title">Todavía no hay cupones</div>
            <div className="admin-empty-text">Creá el primero con el botón “Crear cupón”.</div>
          </div>
        ) : (
          <div className="admin-table-wrapper admin-mobile-cards admin-mobile-cards--coupons">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descuento</th>
                  <th>Compra mínima</th>
                  <th>Usos</th>
                  <th>Vigencia</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => {
                  const expired = isCouponExpired(coupon.validUntil);
                  const notStarted = isCouponNotStarted(coupon.validFrom);
                  const exhausted =
                    coupon.maxUses !== null && (coupon.usedCount ?? 0) >= coupon.maxUses;
                  const isEffective = coupon.isActive !== false && !expired && !notStarted && !exhausted;

                  return (
                    <tr key={coupon.id}>
                      <td>
                        <code className="admin-coupon-code">{coupon.code}</code>
                      </td>
                      <td>
                        {coupon.type === 'percent'
                          ? `${coupon.value}%`
                          : formatPrice(coupon.value)}
                      </td>
                      <td>
                        {coupon.minPurchase != null ? formatPrice(coupon.minPurchase) : '—'}
                      </td>
                      <td>
                        {coupon.maxUses != null ? `${coupon.usedCount ?? 0} / ${coupon.maxUses}` : `${coupon.usedCount ?? 0} / ∞`}
                      </td>
                      <td>
                        {coupon.validFrom || coupon.validUntil ? (
                          <span className={expired ? 'admin-coupon-expired' : notStarted ? 'admin-coupon-expired' : undefined}>
                            {toDateInput(coupon.validFrom) || 'hoy'}
                            {' → '}
                            {toDateInput(coupon.validUntil) || 'sin fin'}
                          </span>
                        ) : (
                          'Sin límite'
                        )}
                      </td>
                      <td>
                        <span className={`admin-product-status-badge ${isEffective ? 'admin-product-status-badge--active' : 'admin-product-status-badge--inactive'}`}>
                          {coupon.isActive === false
                            ? 'Inactivo'
                            : expired
                              ? 'Vencido'
                              : notStarted
                                ? 'Programado'
                                : exhausted
                                  ? 'Agotado'
                                  : 'Activo'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-productos-actions">
                          <CouponForm coupon={coupon} />
                          <CouponRowActions
                            id={coupon.id}
                            code={coupon.code}
                            isActive={coupon.isActive !== false}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
