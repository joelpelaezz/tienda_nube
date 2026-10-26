import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ProductActions from '@/components/ProductActions';
import ProductCard from '@/components/ProductCard';
import SocialIcons from '@/components/social/SocialIcons';
import ProductGallery from '@/components/ProductGallery';
import PaymentMethodsModal from '@/components/PaymentMethodsModal';
import ShippingCalculator from '@/components/ShippingCalculator';
import { db } from '@/lib/db';
import { products, productImages, productVariants, productVariantOptions } from '@/drizzle/schema';
import { eq, desc, sql, and, inArray } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { formatPrice } from '@/lib/utils/format';
import type { ProductCardData, ProductDetailData } from '@/types/product';
import type { Metadata } from 'next';
import { getPaymentMethods, getSettings } from '@/app/admin/configuracion/actions';
import { getShippingConfiguration } from '@/app/admin/envios/actions';
import { getPricePresentation, isSellablePrice } from '@/lib/products/pricing';

interface ProductPageProps {
  params: Promise<{
    slug: string;
  }>;
}

function toAbsoluteUrl(url: string | undefined, publicSiteUrl: string) {
  if (!url) return undefined;
  return url.startsWith('/') ? `${publicSiteUrl}${url}` : url;
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
        stock: products.stock,
        reservedStock: products.reservedStock,
        productType: products.productType,
        discount: products.discount,
        badge: products.badge,
        hasFreeShipping: products.hasFreeShipping,
         imageUrl: productImages.url,
         imageAlt: productImages.alt,
      })
      .from(products)
      .leftJoin(productImages, eq(products.id, productImages.productId))
      .where(and(eq(products.slug, slug), eq(products.isVisible, true)))
      .orderBy(productImages.position);
  } catch (error) {
    console.error('Error fetching product:', error);
    return [];
  }
}

async function getVariants(productId: number) {
  try {
    const variants = await db
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        name: productVariants.name,
        price: productVariants.price,
        priceOffer: productVariants.priceOffer,
        imageUrl: productVariants.imageUrl,
        stock: productVariants.stock,
        reservedStock: productVariants.reservedStock,
        variantTypeId: productVariants.variantTypeId,
        weight: productVariants.weight,
        length: productVariants.length,
        width: productVariants.width,
        height: productVariants.height,
        sku: productVariants.sku,
        barcode: productVariants.barcode,
        isVisible: productVariants.isVisible,
      })
      .from(productVariants)
      .where(and(eq(productVariants.productId, productId), eq(productVariants.isVisible, true)));
    const relations = variants.length > 0
      ? await db.select().from(productVariantOptions).where(inArray(productVariantOptions.productVariantId, variants.map((variant) => variant.id)))
      : [];
    return variants.map((variant) => ({
      ...variant,
      optionIds: relations
        .filter((relation) => relation.productVariantId === variant.id)
        .sort((a, b) => a.position - b.position)
        .map((relation) => String(relation.variantOptionId)),
    }));
  } catch (error) {
    console.error('Error fetching variants:', error);
    return [];
  }
}

async function getVariantStockMap(productId: number, productType?: string | null): Promise<Record<number, number>> {
  if (productType === 'digital') return {};
  try {
    const variants = await db
      .select({
        id: productVariants.id,
        stock: sql<number>`coalesce(${productVariants.stock}, 0)`,
        reservedStock: sql<number>`coalesce(${productVariants.reservedStock}, 0)`,
      })
      .from(productVariants)
      .where(and(eq(productVariants.productId, productId), eq(productVariants.isVisible, true)));
    const map: Record<number, number> = {};
    for (const v of variants) {
      map[v.id] = Math.max(0, v.stock - v.reservedStock);
    }
    return map;
  } catch {
    return {};
  }
}

async function getRelatedProducts(productId: number): Promise<ProductCardData[]> {
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
        hasFreeShipping: products.hasFreeShipping,
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
      .where(and(sql`exists (
        select 1 from product_categories pc
        where pc.product_id = ${products.id}
          and pc.category_id in (
            select pc2.category_id from product_categories pc2 where pc2.product_id = ${productId}
          )
      )`, eq(products.isVisible, true), sql`${products.id} <> ${productId}`))
      .orderBy(desc(products.createdAt))
      .limit(16);

    return result;
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
  const shareSettings = await getSettings();
  const publicSiteUrl = (shareSettings.publicSiteUrl || 'https://www.tendenciashop.com.ar').replace(/\/+$/, '');
  const shareUrl = `${publicSiteUrl}/productos/${product.slug}/`;
  const shareText = (shareSettings.socialShareText || 'Mirá este producto: {product}').replace('{product}', product.name);
  const shareImageUrl = toAbsoluteUrl(shareSettings.socialShareImageUrl || product.imageUrl || undefined, publicSiteUrl);
  return {
    title: `${product.name} - Tendencia Shop`,
    description: product.description || `Comprá ${product.name} en Tendencia Shop`,
    metadataBase: new URL(publicSiteUrl),
    openGraph: {
      title: product.name,
      description: product.description || `Comprá ${product.name} en Tendencia Shop`,
      url: shareUrl,
      ...(shareImageUrl ? { images: [{ url: shareImageUrl, alt: product.name }] } : {}),
    },
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
  const variantStockMap = await getVariantStockMap(product.id, product.productType);
  const relatedProducts = await getRelatedProducts(product.id);
  let paymentMethods: Awaited<ReturnType<typeof getPaymentMethods>> = [];
  try {
    paymentMethods = await getPaymentMethods();
  } catch {
    // Table may not exist yet during build
  }
  const activePaymentMethods = paymentMethods.filter(m => m.isActive);
  const transferPayment = activePaymentMethods.find((method) => method.id === 'transferencia');
  const hasTransferPayment = transferPayment != null;
  const hasInstallmentsPayment = activePaymentMethods.some((method) => method.type === 'card' || method.type === 'card_credit');
  const { methods: shippingMethods } = await getShippingConfiguration();
  const hasActiveShippingMethod = shippingMethods.some((method) => method.isActive);
  const shareSettings = await getSettings();
  const publicSiteUrl = (shareSettings.publicSiteUrl || 'https://www.tendenciashop.com.ar').replace(/\/+$/, '');
  const shareUrl = `${publicSiteUrl}/productos/${product.slug}/`;
  const shareText = (shareSettings.socialShareText || 'Mirá este producto: {product}').replace('{product}', product.name);
  const shareImageUrl = toAbsoluteUrl(shareSettings.socialShareImageUrl || product.imageUrl || undefined, publicSiteUrl) || '';
  // C4-TRACE: only render payment and shipping amounts when a positive product/variant price exists.
  const productPresentation = getPricePresentation({
    regularPrice: product.price,
    offerPrice: product.priceOffer,
  });
  const paymentReferencePrice = variants.length === 0
    ? (isSellablePrice(productPresentation.finalPrice) ? productPresentation.finalPrice : null)
    : variants
      .map((variant) => getPricePresentation({
        regularPrice: product.price,
        offerPrice: product.priceOffer,
        variantRegularPrice: variant.price,
        variantOfferPrice: variant.priceOffer,
      }).finalPrice)
      .filter(isSellablePrice)
      .sort((a, b) => a - b)[0] ?? null;

  const allImages = productData
    .filter((p) => p.imageUrl !== null)
     .map((p) => ({ url: p.imageUrl as string, alt: p.imageAlt || product.name }));

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
          {/* Columna izquierda - Galería de imágenes */}
          <ProductGallery
            images={allImages}
            productName={product.name}
            badge={product.badge}
            discount={product.discount}
            priceOffer={product.priceOffer}
          />

          {/* Columna derecha - Info */}
          <div className="detalle-info">
            <h1 className="detalle-title">{product.name}</h1>
            {product.hasFreeShipping && (
              <span className="detalle-free-shipping-badge">Envío gratis</span>
            )}

            {/* El precio de productos con variantes lo renderiza ProductActions
                junto al selector para reflejar siempre la variante elegida. */}
            {variants.length === 0 && (
              <div className="detalle-prices">
                {isSellablePrice(productPresentation.finalPrice) ? productPresentation.isOnSale ? (
                  <>
                    {productPresentation.regularPrice != null && productPresentation.regularPrice > 0 && (
                      <div className="detalle-price-original">{formatPrice(productPresentation.regularPrice)}</div>
                    )}
                    <div className="detalle-price-row">
                      <span className="detalle-price-offer">{formatPrice(productPresentation.finalPrice)}</span>
                      {product.discount && (
                        <span className="detalle-discount-badge">{product.discount} OFF</span>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="detalle-price-single">{formatPrice(productPresentation.finalPrice)}</div>
                ) : (
                  <div className="detalle-price-single detalle-price-consult">Consultar precio</div>
                )}

                {isSellablePrice(productPresentation.finalPrice) && isSellablePrice(product.priceTransfer) && hasTransferPayment && (
                  <div className="detalle-price-transfer">
                    {formatPrice(product.priceTransfer)} CON TRANSFERENCIA O DEPÓSITO
                  </div>
                )}
              </div>
            )}

            {/* Info de cuotas */}
            {paymentReferencePrice != null && activePaymentMethods.length > 0 && <div className="detalle-installments">
              {hasInstallmentsPayment && <div className="detalle-installment-row">
                <span className="detalle-installment-icon">💳</span>
                <span>12 CUOTAS DE {formatPrice(Math.round(paymentReferencePrice! / 12))}</span>
              </div>}
                {transferPayment?.discountPercent != null && transferPayment.discountPercent > 0 && (
                <div className="detalle-transfer-info">
                  <span className="detalle-transfer-icon">💵</span>
                  <span>{transferPayment.discountPercent}% de descuento pagando con Transferencia o depósito</span>
                </div>
              )}
              <PaymentMethodsModal
                methods={activePaymentMethods}
                productPrice={paymentReferencePrice}
                productTransferPrice={variants.length === 0 && isSellablePrice(product.priceTransfer) ? product.priceTransfer : null}
              />
            </div>}

            {/* Selector de color + Agregar al carrito */}
            <ProductActions
              productId={product.id}
              productName={product.name}
              productSlug={product.slug}
               productPrice={product.price ?? null}
              productPriceOffer={product.priceOffer}
              productTransferPrice={product.priceTransfer}
              productImageUrl={allImages[0]?.url || ''}
              variants={variants.map((v) => ({
                id: v.id,
                name: v.name,
                 price: v.price,
                 priceOffer: v.priceOffer,
                 stock: product.productType === 'digital' ? null : Math.max(0, (v.stock ?? 0) - (v.reservedStock ?? 0)),
                imageUrl: v.imageUrl,
                optionIds: v.optionIds ?? [],
                variantTypeId: v.variantTypeId ?? null,
              }))}
              stockMap={variantStockMap}
              productStock={Math.max(0, product.stock - product.reservedStock)}
              productType={product.productType || 'physical'}
               whatsappNumber={shareSettings.whatsappNumber}
             />

            {/* Info de envío */}
            {(product as any).weight || (product as any).length || (product as any).width || (product as any).height ? (
              <div className="detalle-shipping-info">
                {(product as any).weight && <span>Peso: {(product as any).weight}g</span>}
                {(product as any).length && (product as any).width && (product as any).height &&
                  <span>Dimensiones: {(product as any).length} × {(product as any).width} × {(product as any).height} cm</span>}
              </div>
            ) : null}

            {hasActiveShippingMethod && paymentReferencePrice != null && (
              <ShippingCalculator subtotal={paymentReferencePrice} />
            )}

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
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
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
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareText)}`}
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
                  href={`https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(shareText)}${shareImageUrl ? `&media=${encodeURIComponent(shareImageUrl)}` : ''}`}
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
                 <ProductCard key={relatedProduct.id} {...relatedProduct} showTransferPayment={hasTransferPayment} whatsappNumber={shareSettings.whatsappNumber} />
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
