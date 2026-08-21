import Link from 'next/link';
import { db } from '@/lib/db';
import { products, categories, productImages, productVariants } from '@/drizzle/schema';
import { eq, sql, desc, asc, ilike, and, inArray } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

interface ProductsPageProps {
  searchParams: {
    page?: string;
    search?: string;
    category?: string;
    sort?: string;
  };
}

export default async function AdminProductsPage({ searchParams }: ProductsPageProps) {
  const page = parseInt(searchParams.page || '1');
  const perPage = 20;
  const search = searchParams.search || '';
  const categoryFilter = searchParams.category || '';
  const sort = searchParams.sort || 'newest';
  const offset = (page - 1) * perPage;

  // Build query conditions
  const conditions = [];
  if (search) {
    conditions.push(ilike(products.name, `%${search}%`));
  }
  if (categoryFilter) {
    conditions.push(eq(products.categoryId, parseInt(categoryFilter)));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Determine sort order
  let orderClause;
  switch (sort) {
    case 'name-asc':
      orderClause = asc(products.name);
      break;
    case 'name-desc':
      orderClause = desc(products.name);
      break;
    case 'price-asc':
      orderClause = asc(products.price);
      break;
    case 'price-desc':
      orderClause = desc(products.price);
      break;
    case 'oldest':
      orderClause = asc(products.createdAt);
      break;
    default: // newest
      orderClause = desc(products.createdAt);
  }

  // Fetch products with count, images, and variants
  const [productsData, allCategories] = await Promise.all([
    (async () => {
      const [items, countResult] = await Promise.all([
        db.select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          price: products.price,
          priceOffer: products.priceOffer,
          priceTransfer: products.priceTransfer,
          discount: products.discount,
          badge: products.badge,
          categoryId: products.categoryId,
          isVisible: products.isVisible,
          imageUrl: productImages.url,
        })
          .from(products)
          .leftJoin(productImages, eq(productImages.productId, products.id))
          .where(whereClause)
          .orderBy(orderClause)
          .limit(perPage)
          .offset(offset),
        db.select({ count: sql<number>`count(*)::int` })
          .from(products)
          .where(whereClause)
          .then(r => r[0]),
      ]);

      // Fetch variants for these products
      const productIds = items.map(p => p.id);
      let allVariants: any[] = [];
      if (productIds.length > 0) {
        allVariants = await db.select()
          .from(productVariants)
          .where(inArray(productVariants.productId, productIds));
      }

      // Attach variants to products
      const itemsWithVariants = items.map(p => ({
        ...p,
        variants: allVariants.filter((v: any) => v.productId === p.id),
      }));

      return { items: itemsWithVariants, total: countResult.count };
    })(),
    db.select().from(categories).orderBy(asc(categories.name)),
  ]);

  const totalPages = Math.ceil(productsData.total / perPage);

  // Format price: cents → "25000"
  const formatPrice = (cents: number | null) => {
    if (!cents) return '';
    return (cents / 100).toLocaleString('es-AR');
  };

  // Build URL with current params
  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (overrides.page) params.set('page', overrides.page);
    if (overrides.search !== undefined) params.set('search', overrides.search || '');
    if (overrides.category !== undefined) params.set('category', overrides.category || '');
    if (overrides.sort !== undefined) params.set('sort', overrides.sort || '');
    return `/admin/productos?${params.toString()}`;
  };

  return (
    <div>
      {/* Page header — matches original Tiendanube */}
      <div className="admin-page-header">
        <h1 className="admin-page-title">Productos</h1>
        <div className="admin-page-header-actions">
          <button className="admin-btn admin-btn-secondary admin-btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" />
            </svg>
            Más opciones
          </button>
          <Link href="/admin/productos/new" className="admin-btn admin-btn-primary admin-btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Agregar producto
          </Link>
        </div>
      </div>

      {/* Search + Filters bar */}
      <div className="admin-productos-filter-bar">
        <form method="GET" action="/admin/productos" className="admin-productos-filter-form">
          {categoryFilter && <input type="hidden" name="category" value={categoryFilter} />}
          {sort && <input type="hidden" name="sort" value={sort} />}
          <div className="admin-productos-search-wrapper">
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--nimbus-neutral-interactive)" strokeWidth="2"
              className="admin-productos-search-icon"
            >
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Buscar por nombre, SKU o tags"
              className="admin-input admin-productos-search-input"
            />
          </div>
          <button type="submit" className="admin-btn admin-btn-secondary admin-btn-sm">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" />
            </svg>
            Filtrar
          </button>
          <select
            name="sort"
            className="admin-select admin-productos-sort"
            defaultValue={sort}
          >
            <option value="newest">Más nuevo</option>
            <option value="oldest">Más antiguo</option>
            <option value="name-asc">Nombre A-Z</option>
            <option value="name-desc">Nombre Z-A</option>
            <option value="price-asc">Menor precio</option>
            <option value="price-desc">Mayor precio</option>
          </select>
        </form>
      </div>

      {/* Product count */}
      <div className="admin-productos-count">
        {productsData.total} productos
      </div>

      {/* Products table */}
      <div className="admin-card admin-productos-table-wrapper">
        {productsData.items.length === 0 ? (
          <div className="admin-empty">
            <div className="admin-empty-icon">📦</div>
            <div className="admin-empty-title">No hay productos</div>
            <div className="admin-empty-text">
              {search ? 'No se encontraron productos con ese nombre.' : 'Creá tu primer producto para empezar a vender.'}
            </div>
            {!search && (
              <Link href="/admin/productos/new" className="admin-btn admin-btn-primary">
                Agregar producto
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th className="admin-productos-th-checkbox">
                      <input type="checkbox" className="admin-checkbox" />
                    </th>
                    <th>Producto</th>
                    <th className="admin-productos-th-stock">Stock</th>
                    <th className="admin-productos-th-price">Precio</th>
                    <th className="admin-productos-th-price">Promocional</th>
                    <th className="admin-productos-th-variants">Variantes</th>
                    <th className="admin-productos-th-actions">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productsData.items.map((product) => {
                    const hasVariants = product.variants.length > 0;

                    if (hasVariants) {
                      // Render each variant as a separate row
                      return product.variants.map((variant, vi) => (
                        <tr key={`p${product.id}-v${variant.id}-i${vi}`}>
                          {vi === 0 && (
                            <td rowSpan={product.variants.length}>
                              <input type="checkbox" className="admin-checkbox" />
                            </td>
                          )}
                          {vi === 0 && (
                            <td rowSpan={product.variants.length}>
                              <div className="admin-table-product-cell">
                                {product.imageUrl ? (
                                  <img src={product.imageUrl} alt={product.name} className="admin-table-product-img" />
                                ) : (
                                  <div className="admin-table-product-img admin-productos-img-placeholder">📷</div>
                                )}
                                <div>
                                  <Link
                                    href={`/admin/productos/${product.id}`}
                                    className="admin-productos-product-link"
                                  >
                                    {product.name}
                                  </Link>
                                  {!product.isVisible && (
                                    <div className="admin-productos-hidden-badge">
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                        <line x1="1" y1="1" x2="23" y2="23" />
                                      </svg>
                                      Oculto
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          )}
                          <td className="admin-productos-td-center">
                            {variant.stock != null && variant.stock > 0 ? (
                              <span className="admin-productos-stock-value">{variant.stock}</span>
                            ) : (
                              <span className="admin-productos-stock-empty">Sin stock</span>
                            )}
                          </td>
                          <td>
                            <div className="admin-table-price-cell">
                              <span className="admin-productos-price-prefix">$</span>
                              <span className="admin-productos-price-value">
                                {formatPrice(product.price) || '—'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <div className="admin-table-price-cell">
                              <span className="admin-productos-price-prefix">$</span>
                              <span className={`admin-productos-price-value ${product.priceOffer ? 'admin-productos-price-value--active' : 'admin-productos-price-value--disabled'}`}>
                                {formatPrice(product.priceOffer) || '—'}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="admin-productos-variant-name">
                              {variant.name}
                            </span>
                          </td>
                          <td>
                            <div className="admin-productos-actions">
                              <Link href={`/admin/productos/${product.id}`} className="admin-productos-action-btn" title="Compartir">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                                </svg>
                              </Link>
                              <Link href={`/admin/productos/${product.id}`} className="admin-productos-action-btn" title="Duplicar">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                              </Link>
                              <button className="admin-productos-action-btn" title="Eliminar">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ));
                    }

                    // Single product (no variants)
                    return (
                      <tr key={`p${product.id}-single`}>
                        <td>
                          <input type="checkbox" className="admin-checkbox" />
                        </td>
                        <td>
                          <div className="admin-table-product-cell">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="admin-table-product-img" />
                            ) : (
                              <div className="admin-table-product-img admin-productos-img-placeholder">📷</div>
                            )}
                            <div>
                              <Link
                                href={`/admin/productos/${product.id}`}
                                className="admin-productos-product-link"
                              >
                                {product.name}
                              </Link>
                              {!product.isVisible && (
                                <div className="admin-productos-hidden-badge">
                                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                    <line x1="1" y1="1" x2="23" y2="23" />
                                  </svg>
                                  Oculto
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="admin-productos-td-center">
                          <span className="admin-productos-dash">—</span>
                        </td>
                        <td>
                          <div className="admin-table-price-cell">
                            <span className="admin-productos-price-prefix">$</span>
                            <span className="admin-productos-price-value">
                              {formatPrice(product.price) || '—'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className="admin-table-price-cell">
                            <span className="admin-productos-price-prefix">$</span>
                            <span className={`admin-productos-price-value ${product.priceOffer ? 'admin-productos-price-value--active' : 'admin-productos-price-value--disabled'}`}>
                              {formatPrice(product.priceOffer) || '—'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span className="admin-productos-dash">—</span>
                        </td>
                        <td>
                          <div className="admin-productos-actions">
                            <Link href={`/admin/productos/${product.id}`} className="admin-productos-action-btn" title="Compartir">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                              </svg>
                            </Link>
                            <Link href={`/admin/productos/${product.id}`} className="admin-productos-action-btn" title="Duplicar">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                              </svg>
                            </Link>
                            <button className="admin-productos-action-btn" title="Eliminar">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="admin-pagination">
              <span className="admin-pagination-info">
                Mostrando {offset + 1}-{Math.min(offset + perPage, productsData.total)} productos de {productsData.total}
              </span>

              {totalPages > 1 && (
                <div className="admin-pagination-buttons">
                  {page > 1 && (
                    <Link
                      href={buildUrl({ page: String(page - 1), search, category: categoryFilter, sort })}
                      className="admin-btn admin-btn-ghost admin-btn-sm admin-pagination-btn"
                    >
                      ←
                    </Link>
                  )}

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Link
                      key={p}
                      href={buildUrl({ page: String(p), search, category: categoryFilter, sort })}
                      className={`admin-btn admin-btn-sm admin-pagination-btn ${p === page ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
                    >
                      {p}
                    </Link>
                  ))}

                  {page < totalPages && (
                    <Link
                      href={buildUrl({ page: String(page + 1), search, category: categoryFilter, sort })}
                      className="admin-btn admin-btn-ghost admin-btn-sm admin-pagination-btn"
                    >
                      →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
