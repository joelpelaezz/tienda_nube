import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import CartDrawer from '@/components/CartDrawer';
import HomeCarousel from '@/components/HomeCarousel';
import SocialIcons from '@/components/social/SocialIcons';
import { db } from '@/lib/db';
import { products, productImages, productVariants } from '@/drizzle/schema';
import { eq, desc, isNotNull, inArray } from 'drizzle-orm';
import type { ProductCardData } from '@/types/product';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tendencia Shop - Tu estilo capibara, nuestra tendencia',
  description: 'Descubrí nuestra colección de productos capibara. Envíos a todo el país.',
};

async function getFeaturedProducts(): Promise<ProductCardData[]> {
  try {
    const items = await db
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
      .leftJoin(productImages, eq(products.id, productImages.productId))
      .where(isNotNull(products.price))
      .orderBy(desc(products.createdAt))
      .limit(12);

    // Fetch variants for all products
    const productIds = items.map(p => p.id);
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

    return items.map(p => ({
      ...p,
      variants: variantsByProduct.get(p.id) || [],
    }));
  } catch (error) {
    console.error('Error fetching featured products:', error);
    return [];
  }
}

async function getSaleProducts(): Promise<ProductCardData[]> {
  try {
    const items = await db
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
      .leftJoin(productImages, eq(products.id, productImages.productId))
      .where(isNotNull(products.priceOffer))
      .orderBy(desc(products.createdAt))
      .limit(4);

    // Fetch variants for all products
    const productIds = items.map(p => p.id);
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

    return items.map(p => ({
      ...p,
      variants: variantsByProduct.get(p.id) || [],
    }));
  } catch (error) {
    console.error('Error fetching sale products:', error);
    return [];
  }
}

export default async function HomePage() {
  const [featuredProducts, saleProducts] = await Promise.all([
    getFeaturedProducts(),
    getSaleProducts(),
  ]);

  return (
    <>
      <Header />
      <CartDrawer />

      <main>
        {/* Carousel */}
        <HomeCarousel />

        {/* Trust badges */}
        <section className="home-trust">
          <div className="container">
            <div className="home-trust-grid">
              <div className="home-trust-item">
                <span className="home-trust-icon">📦</span>
                <h3 className="home-trust-title">Enviamos tu compra</h3>
                <p className="home-trust-text">Entregas a todo el país</p>
              </div>
              <div className="home-trust-item">
                <span className="home-trust-icon">💳</span>
                <h3 className="home-trust-title">Pagá como quieras</h3>
                <p className="home-trust-text">Tarjetas de crédito o efectivo</p>
              </div>
              <div className="home-trust-item">
                <span className="home-trust-icon">🔒</span>
                <h3 className="home-trust-title">Comprá con seguridad</h3>
                <p className="home-trust-text">Tus datos siempre protegidos</p>
              </div>
            </div>
          </div>
        </section>

        {/* Destacados */}
        <section className="home-section">
          <div className="container">
            <h2 className="home-section-title">DESTACADOS</h2>
            <div className="products-grid">
              {featuredProducts.map((product) => (
                <ProductCard key={product.id} {...product} />
              ))}
            </div>
            <div className="home-section-action">
              <a href="/productos/" className="home-btn-more">
                VER TODOS LOS PRODUCTOS
              </a>
            </div>
          </div>
        </section>

        {/* Ofertas */}
        {saleProducts.length > 0 && (
          <section className="home-section home-section-alt">
            <div className="container">
              <h2 className="home-section-title">OFERTAS</h2>
              <div className="products-grid">
                {saleProducts.map((product) => (
                  <ProductCard key={product.id} {...product} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Newsletter + Facebook */}
        <section className="home-newsletter">
          <div className="container">
            <div className="home-newsletter-grid">
              <div className="home-newsletter-form">
                <h2 className="home-newsletter-title">NUESTRO NEWSLETTER</h2>
                <p className="home-newsletter-desc">
                  Inscribite para recibir nuestras últimas novedades.
                </p>
                <form className="space-y-3">
                  <input type="text" name="name" placeholder="Nombre" className="newsletter-input" />
                  <input type="email" name="email" placeholder="Tu E-Mail" className="newsletter-input" />
                  <button type="submit" className="home-newsletter-btn">INSCRIBIRSE</button>
                </form>
              </div>
              <div className="home-newsletter-social">
                <h2 className="home-newsletter-title">ESTAMOS EN FACEBOOK</h2>
                <div className="home-facebook-card">
                  <div className="home-facebook-header">
                    <div className="home-facebook-avatar">TG</div>
                    <div>
                      <div className="home-facebook-name">Tendencia Shop</div>
                      <button className="home-facebook-like">
                        <span>👍</span> Me gusta
                      </button>
                    </div>
                  </div>
                  <a href="#" className="home-facebook-link">
                    Visitá nuestra página →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Seguinos */}
        <section className="home-follow">
          <div className="container text-center">
            <h2 className="home-section-title">SEGUINOS</h2>
            <SocialIcons />
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
