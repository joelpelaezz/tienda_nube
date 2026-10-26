import Link from 'next/link';
import { db } from '@/lib/db';
import { products, categories, productImages, productVariants, productCategories } from '@/drizzle/schema';
import { eq, sql, desc, asc, ilike, and, inArray } from 'drizzle-orm';
import ProductsTable from '@/components/admin/ProductsTable';

export const dynamic = 'force-dynamic';

interface ProductsPageProps {
  searchParams: {
    page?: string;
    search?: string;
    category?: string;
    sort?: string;
    status?: 'all' | 'active' | 'inactive';
  };
}

export default async function AdminProductsPage({ searchParams }: ProductsPageProps) {
  const page = parseInt(searchParams.page || '1');
  const perPage = 20;
  const search = searchParams.search || '';
  const categoryFilter = searchParams.category || '';
  const sort = searchParams.sort || 'newest';
  const status = searchParams.status || 'all';
  const offset = (page - 1) * perPage;

  // Build query conditions
  const conditions = [];
  if (search) {
    conditions.push(ilike(products.name, `%${search}%`));
  }
  if (categoryFilter) {
    conditions.push(sql`exists (
      select 1 from product_categories pc
      where pc.product_id = ${products.id}
        and pc.category_id = ${parseInt(categoryFilter)}
    )`);
  }
  if (status === 'active') conditions.push(eq(products.isVisible, true));
  if (status === 'inactive') conditions.push(eq(products.isVisible, false));
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

  // Fetch all categories first
  const allCategories = await db.select().from(categories).orderBy(asc(categories.name));
  const categoryMap = new Map(allCategories.map(c => [c.id, c.name]));
  const primaryProductImages = db
    .selectDistinctOn([productImages.productId], {
      productId: productImages.productId,
      url: productImages.url,
    })
    .from(productImages)
    .orderBy(productImages.productId, asc(productImages.position), asc(productImages.id))
    .as('primary_product_images');

  // Fetch products with count, images, variants
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
      hasFreeShipping: products.hasFreeShipping,
      isVisible: products.isVisible,
      stock: products.stock,
      reservedStock: products.reservedStock,
      productType: products.productType,
       imageUrl: primaryProductImages.url,
    })
      .from(products)
      .leftJoin(primaryProductImages, eq(primaryProductImages.productId, products.id))
      .where(whereClause)
      .orderBy(orderClause)
      .limit(perPage)
      .offset(offset),
    db.select({ count: sql<number>`count(*)::int` })
      .from(products)
      .where(whereClause)
      .then(r => r[0]),
  ]);

  const productIds = items.map(p => p.id);
  const [allVariants, allProductCategories] = await Promise.all([
    productIds.length > 0
      ? db.select().from(productVariants).where(inArray(productVariants.productId, productIds))
      : [],
    productIds.length > 0
      ? db.select({ productId: productCategories.productId, categoryId: productCategories.categoryId })
          .from(productCategories)
          .where(inArray(productCategories.productId, productIds))
      : [],
  ]);

  // Build product → categoryName map from junction
  const productCategoryMap = new Map<number, string>();
  for (const pc of allProductCategories) {
    if (!productCategoryMap.has(pc.productId)) {
      const name = categoryMap.get(pc.categoryId) ?? null;
      if (name) productCategoryMap.set(pc.productId, name);
    }
  }

  const productsData = {
    items: items.map(p => ({
      ...p,
      categoryName: productCategoryMap.get(p.id) ?? null,
      variants: allVariants.filter((v: any) => v.productId === p.id),
    })),
    total: countResult.count,
  };

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
    if (overrides.status && overrides.status !== 'all') params.set('status', overrides.status);
    return `/admin/productos?${params.toString()}`;
  };

  return (
    <div>
      {/* Page header — matches original Tiendanube */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Productos</h1>
          <p className="admin-page-subtitle">Administrá el catálogo, los precios, las categorías y la presentación comercial.</p>
        </div>
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
          <select
            name="status"
            className="admin-select admin-productos-status-filter"
            defaultValue={status}
            aria-label="Filtrar por estado"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </form>
      </div>

      {/* Product count */}
      <div className="admin-productos-count">
        {productsData.total} productos
      </div>

      {/* Products table */}
      <ProductsTable
        initialProducts={productsData.items}
        categories={allCategories}
      />

      {/* Pagination */}
      <div className="admin-pagination">
        <span className="admin-pagination-info">
          Mostrando {offset + 1}-{Math.min(offset + perPage, productsData.total)} productos de {productsData.total}
        </span>

        {totalPages > 1 && (
          <div className="admin-pagination-buttons">
            {page > 1 && (
              <Link
                href={buildUrl({ page: String(page - 1), search, category: categoryFilter, sort, status })}
                className="admin-btn admin-btn-ghost admin-btn-sm admin-pagination-btn"
              >
                ←
              </Link>
            )}

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={buildUrl({ page: String(p), search, category: categoryFilter, sort, status })}
                className={`admin-btn admin-btn-sm admin-pagination-btn ${p === page ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
              >
                {p}
              </Link>
            ))}

            {page < totalPages && (
              <Link
                href={buildUrl({ page: String(page + 1), search, category: categoryFilter, sort, status })}
                className="admin-btn admin-btn-ghost admin-btn-sm admin-pagination-btn"
              >
                →
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
