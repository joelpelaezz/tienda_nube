import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductActions from '@/components/ProductActions';
import ProductCard from '@/components/ProductCard';
import SocialIcons from '@/components/social/SocialIcons';
import { db } from '@/lib/db';
import { products, productImages, productVariants, categories } from '@/drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils/format';
import type { ProductCardData, ProductDetailData } from '@/types/product';
import type { Metadata } from 'next';

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

async function getProduct(slug: string): Promise<ProductDetailData[]> {
  try {
    return await db
      .select({
        id: products.id,
        slug: products.slug,
        name: products.name,
        description: products.description,
        price: products.price,
        priceOffer: products.priceOffer,
        priceTransfer: products.priceTransfer,
        discount: products.discount,
        badge: products.badge,
        imageUrl: productImages.url,
        categoryId: products.categoryId,
        categoryName: categories.name,
      })
      .from(products)
      .leftJoin(productImages, eq(products.id, productImages.productId))
      .leftJoin(categories, eq(products.categoryId, categories.id))
      .where(eq(products.slug, slug))
      .orderBy(productImages.position);
  } catch (error) {
    console.error('Error fetching product:', error);
    return [];
  }
}

async function getVariants(productId: number) {
  try {
    return await db
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId));
  } catch (error) {
    console.error('Error fetching variants:', error);
    return [];
  }
}

async function getRelatedProducts(categoryId: number, currentProductId: number): Promise<ProductCardData[]> {
  try {
    const result = await db
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
      .where(eq(products.categoryId, categoryId))
      .orderBy(desc(products.createdAt))
      .limit(16);

    return result.filter((p) => p.id !== currentProductId);
  } catch (error) {
    console.error('Error fetching related products:', error);
    return [];
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const productData = await getProduct(slug);
  if (productData.length === 0) return { title: 'Producto no encontrado' };

  const product = productData[0];
  return {
    title: `${product.name} - Tendencia Shop`,
    description: product.description || `Comprá ${product.name} en Tendencia Shop`,
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const productData = await getProduct(slug);

  if (productData.length === 0) {
    notFound();
  }

  const product = productData[0];
  const variants = await getVariants(product.id);
  const relatedProducts = product.categoryId
    ? await getRelatedProducts(product.categoryId, product.id)
    : [];

  const mainImage = productData[0]?.imageUrl;
  const thumbnails = productData.filter((p) => p.imageUrl !== null && p.imageUrl !== mainImage);

  return (
    <>
      <Header />
      <CartDrawer />

      <main className="container py-8">
        {/* Breadcrumb */}
        <nav className="detalle-breadcrumb">
          <Link href="/" className="hover:text-primary">Inicio</Link>
          <span className="detalle-breadcrumb-sep">&gt;</span>
          <Link href="/productos/" className="hover:text-primary">Productos</Link>
          <span className="detalle-breadcrumb-sep">&gt;</span>
          <span className="text-primary">{product.name}</span>
        </nav>

        {/* Producto - Dos columnas */}
        <div className="detalle-grid">
          {/* Columna izquierda - Imagen */}
          <div className="detalle-gallery">
            <div className="detalle-main-image">
              {mainImage && (
                <Image
                  src={mainImage}
                  alt={product.name}
                  fill
                  className="object-contain"
                  priority
                />
              )}
              {(product.badge || product.discount) && (
                <span className="detalle-oferta-badge">OFERTA</span>
              )}
            </div>

            {thumbnails.length > 0 && (
              <div className="detalle-thumbnails">
                {thumbnails.map((item, index) => (
                  <div key={index} className="detalle-thumbnail">
                    {item.imageUrl && (
                      <Image
                        src={item.imageUrl}
                        alt={`${product.name} - imagen ${index + 2}`}
                        fill
                        className="object-contain"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Columna derecha - Info */}
          <div className="detalle-info">
            <h1 className="detalle-title">{product.name}</h1>

            {/* Precios */}
            <div className="detalle-prices">
              {product.priceOffer ? (
                <>
                  <div className="detalle-price-original">{formatPrice(product.price || 0)}</div>
                  <div className="detalle-price-row">
                    <span className="detalle-price-offer">{formatPrice(product.priceOffer)}</span>
                    {product.discount && (
                      <span className="detalle-discount-badge">{product.discount} OFF</span>
                    )}
                  </div>
                </>
              ) : (
                <div className="detalle-price-single">{formatPrice(product.price || 0)}</div>
              )}

              {product.priceTransfer && (
                <div className="detalle-price-transfer">
                  {formatPrice(product.priceTransfer)} CON TRANSFERENCIA O DEPÓSITO
                </div>
              )}
            </div>

            {/* Info de cuotas */}
            <div className="detalle-installments">
              <div className="detalle-installment-row">
                <span className="detalle-installment-icon">💳</span>
                <span>12 CUOTAS DE {formatPrice(Math.round((product.priceOffer || product.price || 0) / 12))}</span>
              </div>
              <div className="detalle-transfer-info">
                <span className="detalle-transfer-icon">💵</span>
                <span>10% de descuento pagando con Transferencia o depósito</span>
              </div>
              <Link href="#" className="detalle-payment-link">Ver medios de pago</Link>
            </div>

            {/* Selector de color + Agregar al carrito */}
            <ProductActions
              productId={product.id}
              productName={product.name}
              productSlug={product.slug}
              productPrice={product.priceOffer || product.price || 0}
              productImageUrl={mainImage || ''}
              variants={variants.map((v) => ({ id: v.id, name: v.name, price: v.price }))}
            />

            {/* Calculador de envío */}
            <div className="detalle-shipping">
              <div className="detalle-shipping-header">
                <span>🚚</span>
                <span>Medios de envío</span>
              </div>
              <div className="detalle-shipping-form">
                <input
                  type="text"
                  placeholder="Tu código postal"
                  className="detalle-shipping-input"
                />
                <button className="detalle-shipping-btn">CALCULAR</button>
              </div>
              <Link href="#" className="detalle-shipping-help">No sé mi código postal</Link>
            </div>

            {/* Compra protegida */}
            <div className="detalle-trust">
              <div className="detalle-trust-item">
                <span className="detalle-trust-icon">🔒</span>
                <div>
                  <strong>Compra protegida</strong>
                  <p>Tus datos cuidados durante toda la compra.</p>
                </div>
              </div>
            </div>

            {/* Cambios y devoluciones */}
            <div className="detalle-trust">
              <div className="detalle-trust-item">
                <span className="detalle-trust-icon">🔄</span>
                <div>
                  <strong>Cambios y devoluciones</strong>
                  <p>Si no te gusta, podés cambiarlo por otro o devolverlo.</p>
                </div>
              </div>
            </div>

            {/* Compartir */}
            <div className="detalle-share">
              <span className="detalle-share-label">COMPARTIR:</span>
              <div className="detalle-share-icons">
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://www.tendenciashop.com.ar/productos/${product.slug}/`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detalle-share-icon"
                  aria-label="Compartir en Facebook"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                  </svg>
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(`https://www.tendenciashop.com.ar/productos/${product.slug}/`)}&text=${encodeURIComponent(product.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detalle-share-icon"
                  aria-label="Compartir en X"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(`https://www.tendenciashop.com.ar/productos/${product.slug}/`)}&description=${encodeURIComponent(product.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="detalle-share-icon"
                  aria-label="Compartir en Pinterest"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0a12 12 0 0 0-4.373 23.178c-.07-.633-.134-1.606.028-2.297.146-.625.943-3.987.943-3.987s-.24-.481-.24-1.19c0-1.116.647-1.948 1.452-1.948.684 0 1.014.513 1.014 1.128 0 .687-.438 1.712-.665 2.663-.189.796.4 1.446 1.185 1.446 1.422 0 2.514-1.5 2.514-3.666 0-1.917-1.378-3.255-3.346-3.255-2.28 0-3.616 1.708-3.616 3.47 0 .687.264 1.42.595 1.82a.24.24 0 0 1 .055.23c-.061.253-.197.796-.223.907-.035.148-.116.18-.268.108-1-.465-1.624-1.926-1.624-3.1 0-2.523 1.834-4.84 5.286-4.84 2.775 0 4.932 1.977 4.932 4.62 0 2.757-1.739 4.976-4.151 4.976-.811 0-1.573-.421-1.834-.919l-.498 1.902c-.181.695-.669 1.566-.995 2.097A12 12 0 1 0 12 0z" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Descripcion */}
            {product.description && (
              <div className="detalle-description">
                <p>{product.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Productos similares */}
        {relatedProducts.length > 0 && (
          <div className="detalle-similar">
            <h2 className="detalle-similar-title">PRODUCTOS SIMILARES</h2>
            <div className="products-grid">
              {relatedProducts.slice(0, 4).map((relatedProduct) => (
                <ProductCard key={relatedProduct.id} {...relatedProduct} />
              ))}
            </div>
          </div>
        )}

        {/* Seguinos */}
        <div className="detalle-seguinos">
          <h2 className="detalle-seguinos-title">SEGUINOS</h2>
          <SocialIcons />
        </div>
      </main>

      <Footer />
    </>
  );
}
