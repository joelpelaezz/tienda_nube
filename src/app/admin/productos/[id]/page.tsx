import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/lib/db';
import { products, categories, productImages, productVariants, productVariantOptions, productCategories } from '@/drizzle/schema';
import { and, eq, asc } from 'drizzle-orm';
import DeleteProductButton from '../DeleteProductButton';
import ImageManager from './ImageManager';
import ProductPriceSection from './ProductPriceSection';
import EditProductExtras from '@/components/admin/EditProductExtras';
import { submitProductEdit } from '../actions';

export const dynamic = 'force-dynamic';

interface ProductEditPageProps {
  params: { id: string };
}

export default async function AdminProductEditPage({ params }: ProductEditPageProps) {
  const productId = parseInt(params.id);

  if (isNaN(productId)) notFound();

  const [product, productImagesData, productVariantsData, variantOptionRows, allCategories, productCategoryRows] = await Promise.all([
    db.select().from(products).where(eq(products.id, productId)).then(r => r[0]),
    db.select().from(productImages).where(eq(productImages.productId, productId)).orderBy(asc(productImages.position)),
     db.select().from(productVariants).where(and(eq(productVariants.productId, productId), eq(productVariants.isVisible, true))),
     db.select().from(productVariantOptions).innerJoin(productVariants, eq(productVariantOptions.productVariantId, productVariants.id)).where(and(eq(productVariants.productId, productId), eq(productVariants.isVisible, true))),
    db.select().from(categories).orderBy(asc(categories.name)),
    db.select({ categoryId: productCategories.categoryId }).from(productCategories).where(eq(productCategories.productId, productId)),
  ]);

  const currentCategoryIds = productCategoryRows.map(r => r.categoryId);

  if (!product) notFound();

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
      <form id="product-form" action={submitProductEdit.bind(null, productId)}>
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
                  <input type="radio" name="productType" value="physical" defaultChecked={(product as any).productType === 'physical' || !(product as any).productType} />
                  <span>Físico</span>
                </label>
                <label className="admin-radio-label">
                  <input type="radio" name="productType" value="digital" defaultChecked={(product as any).productType === 'digital'} />
                  <span>Digital / servicio</span>
                </label>
              </div>
            </div>

            {/* ──── Peso y dimensiones ──── */}
            <div className="admin-card">
              <h3 className="admin-card-title">Peso y dimensiones</h3>
              <p className="admin-field-hint">Requeridos para calcular el costo de envío.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="admin-form-group">
                  <label className="admin-form-label">Peso (g)</label>
                  <input type="number" name="weight" className="admin-input" min="0"
                    defaultValue={(product as any).weight ?? ''} placeholder="Ej: 500" />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Largo (cm)</label>
                  <input type="number" name="length" className="admin-input" min="0"
                    defaultValue={(product as any).length ?? ''} placeholder="Ej: 20" />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Ancho (cm)</label>
                  <input type="number" name="width" className="admin-input" min="0"
                    defaultValue={(product as any).width ?? ''} placeholder="Ej: 15" />
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Alto (cm)</label>
                  <input type="number" name="height" className="admin-input" min="0"
                    defaultValue={(product as any).height ?? ''} placeholder="Ej: 10" />
                </div>
              </div>
            </div>

            {/* ──── Códigos ──── */}
            <div className="admin-card">
              <h3 className="admin-card-title">Códigos</h3>
              <div className="admin-form-group">
                <label className="admin-form-label">SKU</label>
                <input type="text" name="sku" className="admin-input"
                  defaultValue={(product as any).sku ?? ''} placeholder="Código interno" />
              </div>
              <div className="admin-form-group" style={{ marginBottom: 0 }}>
                <label className="admin-form-label">Código de barras</label>
                <input type="text" name="barcode" className="admin-input"
                  defaultValue={(product as any).barcode ?? ''} placeholder="EAN, UPC, ISBN..." />
              </div>
            </div>

            {/* ──── SEO ──── */}
            <div className="admin-card">
              <h3 className="admin-card-title">SEO</h3>
              <div className="admin-form-group">
                <label className="admin-form-label">Título SEO</label>
                <input type="text" name="seoTitle" className="admin-input"
                  defaultValue={(product as any).seoTitle ?? ''}
                  placeholder="Título para buscadores (70 caracteres)" />
              </div>
              <div className="admin-form-group" style={{ marginBottom: 0 }}>
                <label className="admin-form-label">Descripción SEO</label>
                <textarea name="seoDescription" className="admin-input" rows={3}
                  defaultValue={(product as any).seoDescription ?? ''}
                  placeholder="Descripción para Google y redes sociales (160 caracteres)"
                  style={{ resize: 'vertical' }} />
              </div>
            </div>

            {/* ──── Categorías y Variantes (editor interactivo) ──── */}
            <EditProductExtras
              productId={product.id}
              currentCategoryIds={currentCategoryIds}
              categories={allCategories}
              existingVariants={productVariantsData.map((v) => ({
                id: v.id,
                name: v.name,
                stock: v.stock,
                price: v.price,
                priceOffer: v.priceOffer,
                imageUrl: v.imageUrl,
                optionIds: variantOptionRows
                  .filter((row) => row.product_variant_options.productVariantId === v.id)
                  .sort((a, b) => a.product_variant_options.position - b.product_variant_options.position)
                  .map((row) => String(row.product_variant_options.variantOptionId)),
                isVisible: v.isVisible,
              }))}
              productImages={productImagesData.map((image) => ({ id: image.id, url: image.url, alt: image.alt }))}
            />

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

              <ProductPriceSection
                formId="product-form"
                price={product.price}
                priceOffer={product.priceOffer}
                priceTransfer={product.priceTransfer}
                hasVariants={productVariantsData.length > 0}
                inheritedVariantCount={productVariantsData.filter((variant) => variant.price == null).length}
                customVariantCount={productVariantsData.filter((variant) => variant.price != null).length}
                productType={product.productType}
                stock={product.stock}
                reservedStock={product.reservedStock}
              />
            </div>

            {/* Envío */}
            <div className="admin-card">
              <h3 className="admin-card-title admin-card-title--sm">Envío</h3>

              <label className="admin-checkbox-label">
                <input type="checkbox" name="hasFreeShipping" defaultChecked={product.hasFreeShipping} />
                <span>Este producto tiene envío gratis</span>
              </label>
            </div>

            {/* Otros */}
            <div className="admin-card">
              <h3 className="admin-card-title admin-card-title--sm">Otros</h3>

              <div className="admin-form-group" style={{ marginBottom: 0 }}>
                <label className="admin-form-label">Badge</label>
                <input
                  type="text"
                  className="admin-input"
                  name="badge"
                  defaultValue={product.badge || ''}
                  placeholder="Ej: Nuevo, Oferta, Edición limitada"
                />
              </div>
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
