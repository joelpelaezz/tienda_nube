import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { products, categories, productImages, productVariants } from '@/drizzle/schema';
import { eq, asc } from 'drizzle-orm';
import DeleteProductButton from '../DeleteProductButton';
import ImageManager from './ImageManager';

export const dynamic = 'force-dynamic';

interface ProductEditPageProps {
  params: { id: string };
}

export default async function AdminProductEditPage({ params }: ProductEditPageProps) {
  const productId = parseInt(params.id);

  if (isNaN(productId)) notFound();

  const [product, productImagesData, productVariantsData, allCategories] = await Promise.all([
    db.select().from(products).where(eq(products.id, productId)).then(r => r[0]),
    db.select().from(productImages).where(eq(productImages.productId, productId)).orderBy(asc(productImages.position)),
    db.select().from(productVariants).where(eq(productVariants.productId, productId)),
    db.select().from(categories).orderBy(asc(categories.name)),
  ]);

  if (!product) notFound();

  const formatPrice = (cents: number | null) => {
    if (!cents) return '';
    return String(cents / 100);
  };

  return (
    <div>
      {/* Back link */}
      <div className="admin-edit-back">
        <Link href="/admin/productos" className="admin-edit-back-link">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" />
          </svg>
          Volver
        </Link>
      </div>

      {/* Header — product name as title */}
      <div className="admin-edit-header">
        <div className="admin-edit-header-left">
          <h1 className="admin-page-title">{product.name}</h1>
          <span className="admin-edit-visibility-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            {product.isVisible ? 'Visible' : 'Oculto'}
          </span>
        </div>

        <div className="admin-edit-header-actions">
          <DeleteProductButton productId={product.id} />
          <Link
            href={`/productos/${product.slug}`}
            className="admin-btn admin-btn-secondary admin-btn-sm"
            target="_blank"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
            Ver en tienda
          </Link>
          <button className="admin-btn admin-btn-primary admin-btn-sm" type="submit" form="product-form">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Guardar
          </button>
        </div>
      </div>

      {/* Form */}
      <form id="product-form">
        <div className="admin-edit-layout">
          {/* Left column — main content */}
          <div className="admin-edit-main">

            {/* ──── Nombre y descripción ──── */}
            <div className="admin-card">
              <h3 className="admin-card-title">Nombre y descripción</h3>

              <div className="admin-form-group">
                <label className="admin-form-label">Nombre</label>
                <input type="text" className="admin-input" defaultValue={product.name} name="name" />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label admin-card-title-row">
                  Descripción
                  <button type="button" className="admin-ai-btn">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                    </svg>
                    Generar con IA
                  </button>
                </label>

                {/* Rich text toolbar */}
                <div className="admin-rich-toolbar">
                  <select className="admin-rich-toolbar-select">
                    <option>Párrafo</option>
                  </select>
                  <div className="admin-rich-toolbar-separator" />
                  <button type="button" className="admin-rich-toolbar-btn" style={{ fontWeight: 700 }}>B</button>
                  <button type="button" className="admin-rich-toolbar-btn" style={{ fontStyle: 'italic' }}>I</button>
                  <button type="button" className="admin-rich-toolbar-btn" style={{ textDecoration: 'underline' }}>U</button>
                  <div className="admin-rich-toolbar-separator" />
                  <button type="button" className="admin-rich-toolbar-btn--icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  </button>
                  <button type="button" className="admin-rich-toolbar-btn--icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  </button>
                  <button type="button" className="admin-rich-toolbar-btn--icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                  </button>
                  <button type="button" className="admin-rich-toolbar-btn--icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="21" x2="9" y2="9" />
                    </svg>
                  </button>
                  <button type="button" className="admin-rich-toolbar-btn--icon" style={{ color: 'var(--nimbus-neutral-text-low)' }}>
                    •••
                  </button>
                </div>

                <textarea
                  className="admin-input admin-description-textarea"
                  rows={8}
                  defaultValue={product.description || ''}
                  name="description"
                />
              </div>
            </div>

            {/* ──── Fotos y video ──── */}
            <ImageManager productId={product.id} images={productImagesData} />

            {/* ──── Tipo de producto ──── */}
            <div className="admin-card">
              <h3 className="admin-card-title">Tipo de producto</h3>

              <div className="admin-radio-group">
                <label className="admin-radio-label">
                  <input type="radio" name="productType" value="fisico" defaultChecked />
                  <span>Físico</span>
                </label>
                <label className="admin-radio-label">
                  <input type="radio" name="productType" value="digital" />
                  <span>Digital / servicio</span>
                </label>
              </div>
            </div>

            {/* ──── Categorías ──── */}
            <div className="admin-card">
              <h3 className="admin-card-title admin-card-title-row">
                Categorías
                <button type="button" className="admin-ai-btn">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                  </svg>
                  Generar con IA
                </button>
              </h3>

              <div style={{ display: 'flex', gap: 'var(--nimbus-space-2)', flexWrap: 'wrap', marginBottom: 'var(--nimbus-space-3)' }}>
                {allCategories.filter(c => c.id === product.categoryId).map(cat => (
                  <span key={cat.id} className="admin-tag">
                    {cat.name}
                    <button type="button" className="admin-tag-remove">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>

              <button type="button" className="admin-link-btn admin-link-btn--primary">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Editar categorías
              </button>
            </div>

            {/* ──── Variantes ──── */}
            <div className="admin-card">
              <h3 className="admin-card-title">Variantes</h3>

              {/* Properties */}
              <div className="admin-form-group">
                <label className="admin-form-label">Propiedades</label>
                <div style={{ display: 'flex', gap: 'var(--nimbus-space-2)', flexWrap: 'wrap', marginBottom: 'var(--nimbus-space-2)' }}>
                  <span className="admin-tag">
                    Color: {productVariantsData.map(v => v.name).join(', ') || 'Sin variantes'}
                  </span>
                </div>
                <button type="button" className="admin-link-btn admin-link-btn--primary">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                  Editar propiedades
                </button>
              </div>

              {/* Variants table */}
              {productVariantsData && productVariantsData.length > 0 ? (
                <div className="admin-table-wrapper admin-edit-variants-table">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Variante</th>
                        <th className="admin-productos-th-stock">Stock</th>
                        <th className="admin-productos-th-price">Precio</th>
                        <th className="admin-productos-th-price">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productVariantsData.map((v) => (
                        <tr key={v.id}>
                          <td>
                            <div className="admin-edit-variant-cell">
                              <div className="admin-edit-variant-thumb">
                                {productImagesData[0] ? (
                                  <img src={productImagesData[0].url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <span style={{ fontSize: 12 }}>📷</span>
                                )}
                              </div>
                              <span className="admin-edit-variant-name">{v.name}</span>
                            </div>
                          </td>
                          <td className="admin-productos-td-center">
                            {v.stock != null && v.stock > 0 ? (
                              <span className="admin-productos-stock-value">{v.stock}</span>
                            ) : (
                              <span className="admin-productos-stock-empty">Sin stock</span>
                            )}
                          </td>
                          <td>
                            <div className="admin-edit-price-row">
                              <span className="admin-edit-price-prefix">$</span>
                              <span className="admin-productos-price-value">
                                {v.price ? (v.price / 100).toLocaleString('es-AR') : '—'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="admin-productos-actions">
                              <button type="button" className="admin-btn admin-btn-ghost admin-btn-icon" title="Editar">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                </svg>
                              </button>
                              <button type="button" className="admin-btn admin-btn-ghost admin-btn-icon" title="Eliminar" style={{ color: 'var(--nimbus-danger)' }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="admin-edit-variant-empty">
                  Este producto no tiene variantes.
                </div>
              )}
            </div>

            {/* ──── SEO y búsqueda en la tienda ──── */}
            <div className="admin-card">
              <h3 className="admin-card-title admin-card-title-row">
                SEO y búsqueda en la tienda
                <button type="button" className="admin-ai-btn">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                  </svg>
                  Generar con IA
                </button>
              </h3>

              <div className="admin-form-group">
                <label className="admin-form-label">Tags</label>
                <div className="admin-hint">
                  Agregá palabras clave para ayudar a tus clientes a encontrar este producto en la tienda.
                </div>
                <input type="text" className="admin-input" placeholder="Agregar tag..." />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label admin-card-title-row">
                  Marca
                  <button type="button" className="admin-ai-btn">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                    </svg>
                    Generar con IA
                  </button>
                </label>
                <div className="admin-hint">
                  Indicá la marca para identificar el producto.
                </div>
                <input type="text" className="admin-input" placeholder="Ejemplo: Nike" />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label admin-card-title-row">
                  SEO
                  <button type="button" className="admin-ai-btn">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                    </svg>
                    Generar con IA
                  </button>
                </label>
                <div className="admin-hint">
                  Mejorá la visibilidad de este producto en Google, marketplaces y redes sociales.
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" style={{ fontSize: 'var(--nimbus-fs-caption)' }}>Título SEO</label>
                  <input type="text" className="admin-input" placeholder="Ejemplo: Remeras estampadas" />
                  <div className="admin-edit-char-count">0/70 caracteres</div>
                </div>

                <div className="admin-form-group">
                  <label className="admin-form-label" style={{ fontSize: 'var(--nimbus-fs-caption)' }}>Descripción SEO</label>
                  <textarea className="admin-input" rows={3} placeholder="Ejemplo: ¡Todo el sitio en promoción con envío gratis!" style={{ resize: 'vertical' }} />
                  <div className="admin-edit-char-count">0/160 caracteres</div>
                </div>
              </div>
            </div>

            {/* ──── URL del producto ──── */}
            <div className="admin-card">
              <h3 className="admin-card-title">URL del producto</h3>

              <div className="admin-form-group" style={{ marginBottom: 0 }}>
                <label className="admin-form-label">Definí una URL simple para facilitar su búsqueda.</label>
                <div className="admin-edit-url-row">
                  <span className="admin-edit-url-prefix">https://tutienda.com/productos/</span>
                  <input
                    type="text"
                    className="admin-input admin-edit-url-input"
                    defaultValue={product.slug}
                  />
                </div>
                <div className="admin-edit-url-hint">
                  En caso de que no la definas y no exista una igual, agregaremos caracteres aleatorios o números.
                </div>
              </div>
            </div>
          </div>

          {/* Right column — sidebar settings */}
          <div className="admin-edit-sidebar">

            {/* Visibilidad */}
            <div className="admin-card">
              <h3 className="admin-card-title admin-card-title--sm">Visibilidad</h3>

              <div className="admin-radio-group">
                {[
                  { value: 'visible', label: 'Visible', desc: 'Aparece en la tienda, en buscadores y en los canales de venta conectados.' },
                  { value: 'no-listado', label: 'No listado', desc: 'Solo se puede ver con un link. Sin que aparezca en la tienda ni en buscadores.' },
                  { value: 'oculto', label: 'Oculto', desc: 'Solo vos podés verlo desde el admin.' },
                ].map(opt => (
                  <label key={opt.value} className="admin-visibility-group">
                    <input
                      type="radio"
                      name="visibility"
                      value={opt.value}
                      defaultChecked={opt.value === (product.isVisible ? 'visible' : 'oculto')}
                      className="admin-checkbox"
                      style={{ marginTop: 2 }}
                    />
                    <div>
                      <div className="admin-visibility-label">{opt.label}</div>
                      <div className="admin-visibility-desc">{opt.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Precio */}
            <div className="admin-card">
              <h3 className="admin-card-title admin-card-title--sm">Precio</h3>

              <div className="admin-form-group">
                <label className="admin-form-label">Precio</label>
                <div className="admin-edit-price-row">
                  <span className="admin-edit-price-prefix">$</span>
                  <input type="number" className="admin-input" defaultValue={formatPrice(product.price)} name="price" />
                </div>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Precio de oferta</label>
                <div className="admin-edit-price-row">
                  <span className="admin-edit-price-prefix">$</span>
                  <input type="number" className="admin-input" defaultValue={formatPrice(product.priceOffer)} name="priceOffer" />
                </div>
              </div>

              <div className="admin-form-group" style={{ marginBottom: 0 }}>
                <label className="admin-form-label">Precio transferencia</label>
                <div className="admin-edit-price-row">
                  <span className="admin-edit-price-prefix">$</span>
                  <input type="number" className="admin-input" defaultValue={formatPrice(product.priceTransfer)} name="priceTransfer" />
                </div>
              </div>
            </div>

            {/* Envío */}
            <div className="admin-card">
              <h3 className="admin-card-title admin-card-title--sm">Envío</h3>

              <label className="admin-checkbox-label">
                <input type="checkbox" />
                <span>Este producto tiene envío gratis</span>
              </label>
            </div>

            {/* Guardar / Cancelar */}
            <div className="admin-edit-footer">
              <Link href="/admin/productos" className="admin-btn admin-btn-secondary admin-edit-footer-btn">
                Cancelar
              </Link>
              <button className="admin-btn admin-btn-primary admin-edit-footer-btn" type="submit">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Producto guardado
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
