import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import CartDrawer from '@/components/CartDrawer';
import SocialIcons from '@/components/social/SocialIcons';
import { db } from '@/lib/db';
import { products, productImages, categories, productVariants } from '@/drizzle/schema';
import { eq, desc, and, or, like, sql, inArray } from 'drizzle-orm';
import Link from 'next/link';
import type { ProductCardData } from '@/types/product';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Productos - Tendencia Shop',
  description: 'Explorá todos nuestros productos capibara.',
};

interface CatalogPageProps {
  searchParams: Promise<{
    q?: string;
    color?: string;
    precio_desde?: string;
    precio_hasta?: string;
    orden?: string;
    page?: string;
  }>;
}

async function getProducts(params: Awaited<CatalogPageProps['searchParams']>) {
  const { q, precio_desde, precio_hasta, orden, page } = params;
  const limit = 21;
  const currentPage = parseInt(page || '1');
  const offset = (currentPage - 1) * limit;

  try {
    const conditions = [];

    if (q) {
      conditions.push(or(
        like(products.name, `%${q}%`),
        like(products.slug, `%${q}%`)
      ));
    }

    if (precio_desde) {
      conditions.push(sql`${products.price} >= ${parseInt(precio_desde) * 100}`);
    }

    if (precio_hasta) {
      conditions.push(sql`${products.price} <= ${parseInt(precio_hasta) * 100}`);
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
        imageUrl: productImages.url,
      })
      .from(products)
      .leftJoin(productImages, eq(products.id, productImages.productId));

    if (conditions.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      baseQuery = baseQuery.where(and(...conditions)) as any;
    }

    let orderedQuery = baseQuery.groupBy(products.id, productImages.url) as ReturnType<typeof baseQuery.groupBy> as unknown as typeof baseQuery;

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
    const countResult = await db.select({ count: sql<number>`count(*)` }).from(products);
    const totalProducts = countResult[0]?.count || 0;
    const totalPages = Math.ceil(totalProducts / limit);

    // Fetch variants for all products
    const productIds = result.map(p => p.id);
    const allVariants = productIds.length > 0
      ? await db.select().from(productVariants).where(inArray(productVariants.productId, productIds))
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

/* ─── Sidebar data hardcodeada (como el original) ─── */
const COLORS = [
  { name: 'Rosa', count: 7, hex: '#FFB6C1' },
  { name: 'Azul', count: 5, hex: '#4169E1' },
  { name: 'Marrón', count: 5, hex: '#8B4513' },
  { name: 'Negro', count: 3, hex: '#000000' },
  { name: 'Beige', count: 3, hex: '#F5F5DC' },
  { name: 'Blanco', count: 1, hex: '#FFFFFF' },
  { name: 'Amarillo', count: 2, hex: '#FFD700' },
  { name: 'Celeste', count: 1, hex: '#87CEEB' },
];

const DISFRAZ = [
  { name: 'Bolsibo!', count: 1 },
  { name: 'Cocinero', count: 1 },
  { name: 'Con Mochila Hamburguesa', count: 1 },
  { name: 'Conejo', count: 1 },
  { name: 'Cumpleañero', count: 1 },
  { name: 'Egresado', count: 1 },
  { name: 'Hamburguesa', count: 1 },
  { name: 'Patita', count: 1 },
];

const TAMAÑO = [
  { name: 'Full', count: 1 },
  { name: 'King', count: 1 },
  { name: 'Queen', count: 1 },
];

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const { products: productsList, totalPages, currentPage } = await getProducts(params);
  const categoriesList = await getCategories();

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
        <div className="catalogo-sort">
          <span className="catalogo-sort-label">Ordenar por</span>
          <select className="catalogo-sort-select" defaultValue={params.orden || 'nuevo'}>
            <option value="nuevo">Más vendidos</option>
            <option value="precio-menor">Precio: menor a mayor</option>
            <option value="precio-mayor">Precio: mayor a menor</option>
            <option value="nombre-az">A - Z</option>
            <option value="nombre-za">Z - A</option>
          </select>
        </div>

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
                      href={`/productos/?q=${cat.slug}`}
                      className={`catalogo-sidebar-link ${params.q === cat.slug ? 'font-bold text-primary' : ''}`}
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
                  {COLORS.map((color) => (
                    <label key={color.name} className="catalogo-color-option">
                      <span className="catalogo-color-dot" style={{ backgroundColor: color.hex }} />
                      <span className="catalogo-color-name">{color.name}</span>
                      <span className="catalogo-color-count">({color.count})</span>
                    </label>
                  ))}
                  <button className="catalogo-filter-more">Ver todos</button>
                </div>
              </div>

              {/* Disfraz */}
              <div className="catalogo-filter">
                <h4 className="catalogo-filter-title">Disfraz</h4>
                <div className="catalogo-filter-options catalogo-tags">
                  {DISFRAZ.map((item) => (
                    <label key={item.name} className="catalogo-tag-option">
                      <input type="checkbox" className="catalogo-tag-checkbox" />
                      <span className="catalogo-tag">{item.name} ({item.count})</span>
                    </label>
                  ))}
                  <button className="catalogo-filter-more">Ver todos</button>
                </div>
              </div>

              {/* Tamaño */}
              <div className="catalogo-filter">
                <h4 className="catalogo-filter-title">Tamaño</h4>
                <div className="catalogo-filter-options catalogo-tags">
                  {TAMAÑO.map((item) => (
                    <label key={item.name} className="catalogo-tag-option">
                      <input type="checkbox" className="catalogo-tag-checkbox" />
                      <span className="catalogo-tag">{item.name} ({item.count})</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Precio */}
              <div className="catalogo-filter">
                <h4 className="catalogo-filter-title">Precio</h4>
                <form action="/productos/" method="GET">
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
              <div className="products-grid">
                {productsList.map((product) => (
                  <ProductCard key={product.id} {...product} />
                ))}
              </div>
            )}

            {/* Paginación / Cargar más */}
            {totalPages > 1 && (
              <div className="catalogo-load-more">
                {currentPage < totalPages ? (
                  <Link href={`/productos/?page=${currentPage + 1}`} className="catalogo-load-more-btn">
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
