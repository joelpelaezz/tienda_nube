import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import CartDrawer from '@/components/CartDrawer';
import SocialIcons from '@/components/social/SocialIcons';
import { db } from '@/lib/db';
import { products, categories, productCategories, productImages, productVariants, variantOptions, variantTypes } from '@/drizzle/schema';
import { eq, desc, asc, and, or, ilike, sql, inArray } from 'drizzle-orm';
import Link from 'next/link';
import type { ProductCardData } from '@/types/product';
import type { Metadata } from 'next';
import { getPaymentMethods } from '@/app/admin/configuracion/actions';

export const metadata: Metadata = {
  title: 'Productos - Tendencia Shop',
  description: 'Explorá todos nuestros productos capibara.',
};

interface CatalogPageProps {
  searchParams: Promise<{
    q?: string;
    categoria?: string;
    color?: string;
    disfraz?: string;
    tamano?: string;
    precio_desde?: string;
    precio_hasta?: string;
    orden?: string;
    page?: string;
  }>;
}

async function getProducts(params: Awaited<CatalogPageProps['searchParams']>) {
  const { q, categoria, color, disfraz, tamano, precio_desde, precio_hasta, orden, page } = params;
  const limit = 21;
  const currentPage = Math.max(1, Number.parseInt(page || '1', 10) || 1);
  const offset = (currentPage - 1) * limit;

  try {
    const conditions = [];

    if (categoria) {
      const [category] = await db.select({ id: categories.id }).from(categories).where(eq(categories.slug, categoria)).limit(1);
      if (!category) return { products: [] as ProductCardData[], totalPages: 0, currentPage: 1 };
      conditions.push(sql`exists (
           select 1 from product_categories pc
           where pc.product_id = ${products.id}
             and pc.category_id = ${category.id}
        )`);
    }

    if (q) {
      conditions.push(or(
         ilike(products.name, `%${q}%`),
         ilike(products.slug, `%${q}%`)
      ));
    }

    const minPrice = precio_desde ? Number(precio_desde) : null;
    const maxPrice = precio_hasta ? Number(precio_hasta) : null;
    if (minPrice !== null && Number.isFinite(minPrice)) {
      conditions.push(sql`coalesce(${products.priceOffer}, ${products.price}) >= ${Math.round(minPrice * 100)}`);
    }

    if (maxPrice !== null && Number.isFinite(maxPrice)) {
      conditions.push(sql`coalesce(${products.priceOffer}, ${products.price}) <= ${Math.round(maxPrice * 100)}`);
    }

    for (const variantFilter of [color, disfraz, tamano]) {
      if (variantFilter) {
        conditions.push(sql`exists (
          select 1 from product_variants pv
          where pv.product_id = ${products.id}
            and pv.is_visible = true
            and pv.name ilike ${`%${variantFilter}%`}
        )`);
      }
    }

    let baseQuery = db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        price: products.price,
        priceOffer: products.priceOffer,
        priceTransfer: products.priceTransfer,
        discount: products.discount,
        badge: products.badge,
        hasFreeShipping: products.hasFreeShipping,
         imageUrl: sql<string | null>`(
           select pi.url from product_images pi
           where pi.product_id = ${products.id}
           order by pi.position asc nulls last, pi.id asc
           limit 1
         )`,
      })
      .from(products)
      .where(and(eq(products.isVisible, true), ...conditions));

    let orderedQuery = baseQuery as typeof baseQuery;

    switch (orden) {
      case 'precio-menor':
        orderedQuery = orderedQuery.orderBy(sql`COALESCE(${products.priceOffer}, ${products.price}) ASC`) as unknown as typeof baseQuery;
        break;
      case 'precio-mayor':
        orderedQuery = orderedQuery.orderBy(sql`COALESCE(${products.priceOffer}, ${products.price}) DESC`) as unknown as typeof baseQuery;
        break;
      case 'nombre-az':
        orderedQuery = orderedQuery.orderBy(products.name) as unknown as typeof baseQuery;
        break;
      case 'nombre-za':
        orderedQuery = orderedQuery.orderBy(sql`${products.name} DESC`) as unknown as typeof baseQuery;
        break;
      default:
        orderedQuery = orderedQuery.orderBy(desc(products.createdAt)) as unknown as typeof baseQuery;
    }

    const result = await (orderedQuery as typeof baseQuery).limit(limit).offset(offset);
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(products).where(and(eq(products.isVisible, true), ...conditions));
    const totalProducts = countResult[0]?.count || 0;
    const totalPages = Math.ceil(totalProducts / limit);

    // Fetch variants for all products
    const productIds = result.map(p => p.id);
    const imageRows = productIds.length > 0
      ? await db.select({ productId: productImages.productId, url: productImages.url })
        .from(productImages)
        .where(inArray(productImages.productId, productIds))
        .orderBy(asc(productImages.position), asc(productImages.id))
      : [];
    const imageByProduct = new Map<number, string>();
    for (const image of imageRows) {
      if (!imageByProduct.has(image.productId)) imageByProduct.set(image.productId, image.url);
    }
    const allVariants = productIds.length > 0
      ? await db.select({
          id: productVariants.id,
          productId: productVariants.productId,
          name: productVariants.name,
          price: productVariants.price,
          priceOffer: productVariants.priceOffer,
          optionIds: productVariants.optionIds,
          stock: sql<number>`greatest(0, coalesce(${productVariants.stock}, 0) - coalesce(${productVariants.reservedStock}, 0))`,
        }).from(productVariants).where(and(inArray(productVariants.productId, productIds), eq(productVariants.isVisible, true)))
      : [];

    // Group variants by product
    const variantsByProduct = new Map<number, typeof allVariants>();
    for (const v of allVariants) {
      if (!variantsByProduct.has(v.productId)) {
        variantsByProduct.set(v.productId, []);
      }
      variantsByProduct.get(v.productId)!.push(v);
    }

    const enriched = result.map(p => ({
      ...p,
      imageUrl: imageByProduct.get(p.id) ?? null,
      variants: variantsByProduct.get(p.id) || [],
    }));

    return { products: enriched as ProductCardData[], totalPages, currentPage };
  } catch (error) {
    console.error('Error fetching products:', error);
    return { products: [] as ProductCardData[], totalPages: 0, currentPage: 1 };
  }
}

async function getCategories() {
  try {
    return await db.select().from(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

type FilterFacet = { name: string; count: number; hex?: string };

const COLOR_HEX: Record<string, string> = {
  rosa: '#FFB6C1', azul: '#4169E1', marrón: '#8B4513', marron: '#8B4513',
  negro: '#000000', beige: '#F5F5DC', blanco: '#FFFFFF', amarillo: '#FFD700',
  celeste: '#87CEEB', verde: '#66BB6A', rojo: '#EF5350', gris: '#9E9E9E',
};

async function getFilterFacets(): Promise<Record<'color' | 'disfraz' | 'tamano', FilterFacet[]>> {
  try {
    const rows = await db
      .select({
        typeName: variantTypes.name,
        value: variantOptions.value,
        count: sql<number>`count(distinct ${productVariants.productId})::int`,
      })
      .from(variantOptions)
      .innerJoin(variantTypes, eq(variantOptions.variantTypeId, variantTypes.id))
      .innerJoin(productVariants, sql`${variantOptions.id}::text = any(${productVariants.optionIds})`)
      .innerJoin(products, and(eq(productVariants.productId, products.id), eq(products.isVisible, true)))
      .where(eq(productVariants.isVisible, true))
      .groupBy(variantTypes.name, variantOptions.value)
      .orderBy(variantTypes.name, variantOptions.value);

    const facets: Record<'color' | 'disfraz' | 'tamano', FilterFacet[]> = { color: [], disfraz: [], tamano: [] };
    for (const row of rows) {
      const type = row.typeName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const key = type.includes('color') ? 'color' : type.includes('disfraz') ? 'disfraz' : type.includes('taman') || type.includes('talle') ? 'tamano' : null;
      if (!key) continue;
      const name = row.value;
      facets[key].push({ name, count: row.count, ...(key === 'color' ? { hex: COLOR_HEX[name.toLowerCase()] || '#9E9E9E' } : {}) });
    }
    return facets;
  } catch (error) {
    console.error('Error fetching product filter facets:', error);
    return { color: [], disfraz: [], tamano: [] };
  }
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const { products: productsList, totalPages, currentPage } = await getProducts(params);
  const categoriesList = await getCategories();
  const facets = await getFilterFacets();
  const paymentMethods = await getPaymentMethods();
  const showTransferPayment = paymentMethods.some((method) => method.isActive && method.id === 'transferencia');
  const buildFilterHref = (key: string, value?: string) => {
    const next = new URLSearchParams();
    for (const [param, paramValue] of Object.entries(params)) {
      if (paramValue && param !== 'page' && param !== key) next.set(param, paramValue);
    }
    if (value) next.set(key, value);
    const query = next.toString();
    return `/productos/${query ? `?${query}` : ''}`;
  };

  return (
    <>
      <Header />
      <CartDrawer />

      <main className="container py-8">
        {/* Breadcrumb */}
        <nav className="catalogo-breadcrumb">
          <Link href="/" className="hover:text-primary">Inicio</Link>
          <span className="catalogo-breadcrumb-sep">&gt;</span>
          <span className="text-primary">Productos</span>
        </nav>

        {/* Titulo */}
        <h1 className="catalogo-title text-center mb-6">PRODUCTOS</h1>

        {/* Ordenar por */}
        <form className="catalogo-sort" action="/productos/" method="GET">
          {Object.entries(params).filter(([key, value]) => key !== 'orden' && key !== 'page' && value).map(([key, value]) => (
            <input key={key} type="hidden" name={key} value={value} />
          ))}
          <label htmlFor="catalogo-orden" className="catalogo-sort-label">Ordenar por</label>
          <select id="catalogo-orden" name="orden" className="catalogo-sort-select" defaultValue={params.orden || 'nuevo'}>
            <option value="nuevo">Más vendidos</option>
            <option value="precio-menor">Precio: menor a mayor</option>
            <option value="precio-mayor">Precio: mayor a menor</option>
            <option value="nombre-az">A - Z</option>
            <option value="nombre-za">Z - A</option>
          </select>
          <button type="submit" className="catalogo-price-btn">Aplicar</button>
        </form>

        <div className="catalogo-layout">
          {/* Sidebar */}
          <aside className="catalogo-sidebar">
            {/* Categorias */}
            <div className="catalogo-sidebar-section">
              <h3 className="catalogo-sidebar-title">CATEGORÍAS</h3>
              <ul className="catalogo-sidebar-list">
                {categoriesList.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={buildFilterHref('categoria', cat.slug)}
                      className={`catalogo-sidebar-link ${params.categoria === cat.slug ? 'font-bold text-primary' : ''}`}
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Filtros */}
            <div className="catalogo-sidebar-section">
              <h3 className="catalogo-sidebar-title">FILTROS</h3>

              {/* Color */}
              <div className="catalogo-filter">
                <h4 className="catalogo-filter-title">Color</h4>
                <div className="catalogo-filter-options">
                  {facets.color.map((color) => (
                    <Link key={color.name} href={buildFilterHref('color', color.name)} className="catalogo-color-option">
                      <span className="catalogo-color-dot" style={{ backgroundColor: color.hex }} />
                      <span className="catalogo-color-name">{color.name}</span>
                      <span className="catalogo-color-count">({color.count})</span>
                    </Link>
                  ))}
                  <Link href={buildFilterHref('color')} className="catalogo-filter-more">Limpiar</Link>
                </div>
              </div>

              {/* Disfraz */}
              <div className="catalogo-filter">
                <h4 className="catalogo-filter-title">Disfraz</h4>
                <div className="catalogo-filter-options catalogo-tags">
                  {facets.disfraz.map((item) => (
                    <Link key={item.name} href={buildFilterHref('disfraz', item.name)} className="catalogo-tag-option">
                      <span className="catalogo-tag">{item.name} ({item.count})</span>
                    </Link>
                  ))}
                  <Link href={buildFilterHref('disfraz')} className="catalogo-filter-more">Limpiar</Link>
                </div>
              </div>

              {/* Tamaño */}
              <div className="catalogo-filter">
                <h4 className="catalogo-filter-title">Tamaño</h4>
                <div className="catalogo-filter-options catalogo-tags">
                  {facets.tamano.map((item) => (
                    <Link key={item.name} href={buildFilterHref('tamano', item.name)} className="catalogo-tag-option">
                      <span className="catalogo-tag">{item.name} ({item.count})</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Precio */}
              <div className="catalogo-filter">
                <h4 className="catalogo-filter-title">Precio</h4>
                <form action="/productos/" method="GET">
                  {Object.entries(params).filter(([key, value]) => !['precio_desde', 'precio_hasta', 'page'].includes(key) && value).map(([key, value]) => (
                    <input key={key} type="hidden" name={key} value={value} />
                  ))}
                  <div className="catalogo-price-filter">
                    <div className="catalogo-price-inputs">
                      <input type="number" name="precio_desde" defaultValue={params.precio_desde} placeholder="Desde" className="catalogo-price-input" />
                      <input type="number" name="precio_hasta" defaultValue={params.precio_hasta} placeholder="Hasta" className="catalogo-price-input" />
                    </div>
                    <button type="submit" className="catalogo-price-btn">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </aside>

          {/* Grid productos */}
          <div className="catalogo-products">
            {productsList.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-lg">No se encontraron productos</p>
                <a href="/productos/" className="btn btn-primary mt-4">Ver todos</a>
              </div>
            ) : (
              <div className="products-grid products-grid--masonry">
                {productsList.map((product) => (
                  <ProductCard key={product.id} {...product} showTransferPayment={showTransferPayment} masonry />
                ))}
              </div>
            )}

            {/* Paginación / Cargar más */}
            {totalPages > 1 && (
              <div className="catalogo-load-more">
                {currentPage < totalPages ? (
                  <Link href={buildFilterHref('page', String(currentPage + 1))} className="catalogo-load-more-btn">
                    MOSTRAR MÁS PRODUCTOS
                  </Link>
                ) : (
                  <span className="text-gray-400 text-sm">No hay más productos</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Seguinos */}
        <div className="catalogo-seguinos">
          <h2 className="catalogo-seguinos-title">SEGUINOS</h2>
          <SocialIcons />
        </div>
      </main>

      <Footer />
    </>
  );
}
