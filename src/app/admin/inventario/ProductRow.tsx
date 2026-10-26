'use client';

import Link from 'next/link';
import Image from 'next/image';
import type { InventoryProduct, InventoryVariant } from './types';
import { getStockLevel } from './stock-utils';

interface ProductRowProps {
  product: InventoryProduct;
  onEditStock: (variant: InventoryVariant) => void;
  onViewHistory: (variant: InventoryVariant) => void;
  onEditProductStock: (product: InventoryProduct) => void;
  onViewProductHistory: (product: InventoryProduct) => void;
}

export default function ProductRow({ product, onEditStock, onViewHistory, onEditProductStock, onViewProductHistory }: ProductRowProps) {
  const hasVariants = product.variants.length > 0;

  return (
    <tr className="admin-inventory-row">
      <td>
        <div className="admin-table-product-cell admin-inventory-product-cell">
          {product.imageUrl ? (
            <Image src={product.imageUrl} alt={product.imageAlt || product.name} width={64} height={64} className="admin-table-product-img" />
          ) : (
            <div className="admin-table-product-img admin-inventory-img-placeholder">📷</div>
          )}
          <div className="admin-inventory-product-copy">
            <Link href={`/admin/productos/${product.id}`} className="admin-inventory-product-name" title={product.name}>
              {product.name}
            </Link>
            {!product.isVisible && <span className="admin-inventory-hidden-badge">Oculto</span>}
          </div>
        </div>
      </td>
      <td>
        {hasVariants ? (
          <div className="admin-inventory-stock-list">
            {product.variants.map((variant) => (
              <div key={variant.id} className="admin-inventory-stock-item">
                <span
                  className={`admin-inventory-stock-value admin-inventory-stock-value--${getStockLevel(variant.availableStock)}`}
                  title={variant.reservedStock > 0 ? `${variant.stock} total, ${variant.reservedStock} reservados` : undefined}
                >
                  {variant.availableStock}
                  {variant.reservedStock > 0 && (
                    <span className="admin-inventory-reserved"> ({variant.reservedStock} res.)</span>
                  )}
                </span>
                <button
                  type="button"
                  className="admin-inventory-edit-link"
                  onClick={() => onEditStock(variant)}
                  title="Editar stock"
                  aria-label={`Editar stock de ${variant.name}`}
                >
                  Editar
                </button>
              </div>
            ))}
          </div>
        ) : product.productType === 'digital' ? (
          <span className="admin-inventory-muted">No requiere stock</span>
        ) : (
          <div className="admin-inventory-stock-item">
            <span className={`admin-inventory-stock-value admin-inventory-stock-value--${getStockLevel(product.availableStock ?? 0)}`}>
              {product.availableStock ?? 0}
              {product.reservedStock > 0 && (
                <span className="admin-inventory-reserved"> ({product.reservedStock} res.)</span>
              )}
            </span>
            <button
              type="button"
              className="admin-inventory-edit-link"
              onClick={() => onEditProductStock(product)}
              title="Editar stock"
              aria-label={`Editar stock de ${product.name}`}
            >
              Editar
            </button>
          </div>
        )}
      </td>
      <td>
        {hasVariants ? (
          <div className="admin-inventory-variant-list">
            {product.variants.map((variant) => (
              <span key={variant.id} className="admin-inventory-variant-tag" title={variant.name}>
                {variant.name}
              </span>
            ))}
          </div>
        ) : product.productType === 'digital' ? (
          <span className="admin-inventory-muted">No aplica</span>
        ) : (
          <span className="admin-inventory-muted">—</span>
        )}
      </td>
      <td>
        {hasVariants ? (
          <div className="admin-inventory-sku-list">
            {product.variants.map((variant) => (
              <span key={variant.id} className="admin-inventory-sku-value" title={variant.sku || 'Sin SKU'}>
                {variant.sku || 'Sin SKU'}
              </span>
            ))}
          </div>
        ) : product.productType === 'digital' ? (
          <span className="admin-inventory-muted">No aplica</span>
        ) : (
          <span className="admin-inventory-muted">{product.sku || 'Sin SKU'}</span>
        )}
      </td>
      <td>
        {hasVariants ? (
          <div className="admin-inventory-history-list">
            {product.variants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                className="admin-btn admin-btn-ghost admin-btn-sm admin-inventory-history-btn"
                onClick={() => onViewHistory(variant)}
                title="Ver historial"
                aria-label={`Ver historial de ${variant.name}`}
              >
                Ver historial
              </button>
            ))}
          </div>
        ) : product.productType === 'digital' ? (
          <span className="admin-inventory-muted">No aplica</span>
        ) : (
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm admin-inventory-history-btn"
            onClick={() => onViewProductHistory(product)}
            title="Ver historial"
            aria-label={`Ver historial de ${product.name}`}
          >
            Ver historial
          </button>
        )}
      </td>
    </tr>
  );
}
