import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductCard from '@/components/ProductCard';
import CartDrawer from '@/components/CartDrawer';
import HomeCarousel from '@/components/HomeCarousel';
import HomeBanner from '@/components/HomeBanner';
import SocialIcons from '@/components/social/SocialIcons';
import NewsletterForm from '@/components/NewsletterForm';
import { db } from '@/lib/db';
import { products, productImages, productVariants, productVariantOptions } from '@/drizzle/schema';
import { eq, desc, asc, isNotNull, inArray, and, or, sql } from 'drizzle-orm';
import type { ProductCardData } from '@/types/product';
import type { Metadata } from 'next';
import { getHomeBanner, getHomeCarouselSlides, getPaymentMethods, getSettings } from '@/app/admin/configuracion/actions';
import { getVariantColorMetadata } from '@/lib/products/variant-color-metadata';

export const metadata: Metadata = {
  title: 'Tendencia Shop - Tu estilo capibara, nuestra tendencia',
  description: 'Descubrí nuestra colección de productos capibara. Envíos a todo el país.',
};

async function getVariantCards(productIds: number[]) {
  if (productIds.length === 0) return [];
  const variants = await db.select({
    id: productVariants.id,
    productId: productVariants.productId,
    name: productVariants.name,
    price: productVariants.price,
    priceOffer: productVariants.priceOffer,
    stock: sql<number>`greatest(0, coalesce(${productVariants.stock}, 0) - coalesce(${productVariants.reservedStock}, 0))`,
  }).from(productVariants).where(and(inArray(productVariants.productId, productIds), eq(productVariants.isVisible, true)));
  const relations = variants.length > 0
    ? await db.select().from(productVariantOptions).where(inArray(productVariantOptions.productVariantId, variants.map((variant) => variant.id)))
    : [];
  const colorMetadata = await getVariantColorMetadata(variants.map((variant) => variant.id));
  return variants.map((variant) => ({
    ...variant,
    colorName: colorMetadata.get(variant.id)?.name ?? null,
    colorHex: colorMetadata.get(variant.id)?.colorHex ?? null,
    optionIds: relations.filter((relation) => relation.productVariantId === variant.id)
      .sort((a, b) => a.position - b.position)
      .map((relation) => String(relation.variantOptionId)),
  }));
}

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
        availableStock: sql<number>`greatest(0, coalesce(${products.stock}, 0) - coalesce(${products.reservedStock}, 0))`,
        productType: products.productType,
         imageUrl: sql<string | null>`(
           select pi.url from product_images pi
           where pi.product_id = ${products.id}
           order by pi.position asc nulls last, pi.id asc
           limit 1
         )`,
      })
      .from(products)
      .where(and(
        eq(products.isVisible, true),
        or(
          isNotNull(products.price),
          sql`exists (
            select 1 from product_variants pv
            where pv.product_id = ${products.id}
              and pv.is_visible = true
              and (coalesce(pv.stock, 0) - coalesce(pv.reserved_stock, 0)) > 0
              and coalesce(pv.price_offer, pv.price, ${products.price}) > 0
          )`,
        ),
      ))
      .orderBy(desc(products.createdAt))
      .limit(12);

    // Fetch variants for all products
    const productIds = items.map(p => p.id);
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
    const allVariants = await getVariantCards(productIds);

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
      imageUrl: imageByProduct.get(p.id) ?? null,
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
        availableStock: sql<number>`greatest(0, coalesce(${products.stock}, 0) - coalesce(${products.reservedStock}, 0))`,
        productType: products.productType,
         imageUrl: sql<string | null>`(
           select pi.url from product_images pi
           where pi.product_id = ${products.id}
           order by pi.position asc nulls last, pi.id asc
           limit 1
         )`,
      })
      .from(products)
      .where(and(
        eq(products.isVisible, true),
        or(
          isNotNull(products.priceOffer),
          sql`exists (
            select 1 from product_variants pv
            where pv.product_id = ${products.id}
              and pv.is_visible = true
              and (coalesce(pv.stock, 0) - coalesce(pv.reserved_stock, 0)) > 0
              and pv.price_offer > 0
          )`,
        ),
      ))
      .orderBy(desc(products.createdAt))
      .limit(4);

    // Fetch variants for all products
    const productIds = items.map(p => p.id);
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
    const allVariants = await getVariantCards(productIds);

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
      imageUrl: imageByProduct.get(p.id) ?? null,
      variants: variantsByProduct.get(p.id) || [],
    }));
  } catch (error) {
    console.error('Error fetching sale products:', error);
    return [];
  }
}

export default async function HomePage() {
  // C4-TRACE: load editable homepage slides alongside the banner override and store contact settings.
  const [featuredProducts, saleProducts, homeBanner, homeCarouselSlides, storeSettings] = await Promise.all([
    getFeaturedProducts(),
    getSaleProducts(),
    getHomeBanner(),
    getHomeCarouselSlides(),
    getSettings(),
  ]);
  const paymentMethods = await getPaymentMethods();
  const showTransferPayment = paymentMethods.some((method) => method.isActive && method.id === 'transferencia');

  return (
    <>
      <Header />
      <CartDrawer />

      <main>
        {/* Banner o Carousel */}
        {homeBanner.isActive && homeBanner.desktopUrl ? (
          <HomeBanner data={homeBanner} />
        ) : (
          <HomeCarousel slides={homeCarouselSlides} />
        )}

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
                  <ProductCard key={`featured-${product.id}`} {...product} showTransferPayment={showTransferPayment} whatsappNumber={storeSettings.whatsappNumber} />
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
                  <ProductCard key={`sale-${product.id}`} {...product} showTransferPayment={showTransferPayment} whatsappNumber={storeSettings.whatsappNumber} />
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
                <NewsletterForm />
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
                  <a href="https://www.facebook.com/tendenciashop22" target="_blank" rel="noopener noreferrer" className="home-facebook-link">
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
