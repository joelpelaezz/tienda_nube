'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useCartStore, useQuickShopStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils/format';
import type { ProductCardData, ProductVariant } from '@/types/product';
import { getVariantColor } from '@/lib/colors';
import { getDiscountPercent, getPricePresentation, isSellablePrice } from '@/lib/products/pricing';
import TrackedWhatsAppLink from '@/components/TrackedWhatsAppLink';

// Map variant names to approximate hex colors
function isAllOutOfStock(variants: ProductVariant[], stockMap?: Record<number, number>): boolean {
  if (variants.length === 0) return false;
  // If no stockMap provided, use variant.stock (if available)
  if (!stockMap) {
    return variants.every((v) => (v.stock ?? 0) <= 0);
  }
  return variants.every((v) => (stockMap[v.id] ?? -1) <= 0);
}

export default function ProductCard({
  id,
  slug,
  name,
  price,
  priceOffer,
  priceTransfer,
  badge,
  hasFreeShipping,
  imageUrl,
  variants = [],
  availableStock,
  productType = 'physical',
  stockMap,  // optional: variantId -> available stock
  showTransferPayment = false,
  masonry = false,
  whatsappNumber = '',
}: ProductCardData & { stockMap?: Record<number, number>; showTransferPayment?: boolean; masonry?: boolean; whatsappNumber?: string }) {
  const addItem = useCartStore((s) => s.addItem);
  const openQuickShop = useQuickShopStore((s) => s.openQuickShop);
  const cardRef = useRef<HTMLDivElement>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [masonryRowSpan, setMasonryRowSpan] = useState<number | null>(null);

  useEffect(() => {
    if (!masonry || !cardRef.current) return;

    const card = cardRef.current;
    const grid = card.parentElement;
    if (!grid) return;

    // C4-TRACE: convert the measured card height into CSS grid row spans.
    const updateRowSpan = () => {
      const gridStyles = window.getComputedStyle(grid);
      const rowHeight = Number.parseFloat(gridStyles.gridAutoRows) || 8;
      const rowGap = Number.parseFloat(gridStyles.rowGap) || 0;
      const cardHeight = card.getBoundingClientRect().height;
      const nextSpan = Math.ceil((cardHeight + rowGap) / (rowHeight + rowGap));
      setMasonryRowSpan((currentSpan) => currentSpan === nextSpan ? currentSpan : nextSpan);
    };

    const resizeObserver = new ResizeObserver(updateRowSpan);
    resizeObserver.observe(card);
    window.addEventListener('resize', updateRowSpan);
    updateRowSpan();

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateRowSpan);
    };
  }, [masonry]);

  const tracksStock = productType !== 'digital';
  const outOfStock = tracksStock && (variants.length > 0
    ? isAllOutOfStock(variants, stockMap)
    : availableStock === 0);
  const requiresVariantSelection = variants.length > 0 && selectedVariant === null;
  const uniqueColorCount = new Set(
    variants.map((variant) => variant.colorName?.trim().toLocaleLowerCase('es')).filter(Boolean)
  ).size;
  const variantBadgeLabel = uniqueColorCount > 0
    ? `${uniqueColorCount} colores`
    : `${variants.length} variantes`;
  const getVariantPresentation = (variant?: ProductVariant | null) => getPricePresentation({
    regularPrice: price,
    offerPrice: priceOffer,
    transferPrice: priceTransfer,
    variantRegularPrice: variant?.price,
    variantOfferPrice: variant?.priceOffer,
  });
  const availableVariantPresentations = variants
    .filter((variant) => !tracksStock || (stockMap?.[variant.id] ?? variant.stock ?? 0) > 0)
    .map((variant) => ({ variant, presentation: getVariantPresentation(variant) }))
    .filter(({ presentation }) => (presentation.finalPrice ?? 0) > 0)
    .sort((a, b) => (a.presentation.finalPrice ?? 0) - (b.presentation.finalPrice ?? 0));
  const startingVariantPresentation = availableVariantPresentations[0]?.presentation ?? null;
  const displayedPresentation = selectedVariant
    ? getVariantPresentation(selectedVariant)
    : price != null
      ? getVariantPresentation()
      : startingVariantPresentation;
  const showStartingPrice = price == null && selectedVariant == null && startingVariantPresentation != null;
  // C4-TRACE: card prices, quick-add, and consultation CTA share the sellable-price predicate.
  const displayedHasPrice = isSellablePrice(displayedPresentation?.finalPrice);
  const hasCardPrice = selectedVariant
    ? displayedHasPrice
    : displayedHasPrice || startingVariantPresentation != null;
  const selectedVariantHasPrice = selectedVariant != null && (getVariantPresentation(selectedVariant).finalPrice ?? 0) > 0;
  const visibleVariants = variants.slice(0, 4);
  const remainingVariantCount = Math.max(0, variants.length - visibleVariants.length);
  const normalizedWhatsappNumber = whatsappNumber.replace(/\D/g, '');
  const consultationMessage = `Hola, quiero consultar el precio de ${name}${selectedVariant ? `, variante ${selectedVariant.name}` : ''}.`;
  const consultationHref = normalizedWhatsappNumber
    ? `https://wa.me/${normalizedWhatsappNumber}?text=${encodeURIComponent(consultationMessage)}`
    : `/contacto?producto=${encodeURIComponent(slug)}&variante=${encodeURIComponent(selectedVariant?.name ?? '')}`;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock || requiresVariantSelection) return;
    const finalPrice = getVariantPresentation(selectedVariant).finalPrice;
    if (finalPrice != null && finalPrice > 0) {
      addItem({
        id,
        slug,
        name,
        price: finalPrice,
        imageUrl,
        variant: selectedVariant?.name,
        variantId: selectedVariant?.id,
        transferPrice: selectedVariant ? null : priceTransfer ?? null,
        availableStock: !tracksStock ? null : selectedVariant?.stock ?? availableStock ?? null,
      });
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1400);
    }
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openQuickShop({
      id,
      name,
      slug,
       price: price || 0,
       priceOffer,
        transferPrice: priceTransfer,
       imageUrl,
       availableStock,
       productType,
       whatsappNumber,
       variants: variants.map(v => ({
         id: v.id,
         name: v.name,
         price: v.price,
         priceOffer: v.priceOffer,
         stock: stockMap?.[v.id] ?? v.stock ?? null,
         colorName: v.colorName,
         colorHex: v.colorHex,
       })),
    });
  };

  return (
    <div
      ref={cardRef}
      className={`product-card ${masonry ? 'product-card--masonry' : ''}`}
      style={masonryRowSpan ? { gridRowEnd: `span ${masonryRowSpan}` } : undefined}
    >
      <Link href={`/productos/${slug}/`}>
        {/* C4-TRACE: preserve each product image ratio within bounded card heights. */}
        <div
          className={`product-card-image ${imageUrl ? '' : 'product-card-image--empty'}`}
          style={imageAspectRatio ? ({ '--product-image-ratio': imageAspectRatio } as CSSProperties) : undefined}
        >
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 25vw"
              className="object-contain"
              priority={false}
              onLoad={(event) => {
                const image = event.currentTarget;
                if (image.naturalWidth > 0 && image.naturalHeight > 0) {
                  setImageAspectRatio(image.naturalWidth / image.naturalHeight);
                }
              }}
            />
          ) : (
            <span className="sr-only">Producto sin imagen</span>
          )}
          {(selectedVariant?.priceOffer ?? priceOffer) != null && (selectedVariant?.priceOffer ?? priceOffer)! > 0 && (
            <span className="product-card-oferta-badge">OFERTA</span>
          )}
          {hasFreeShipping && (
            <span className="product-card-free-shipping-badge product-card-free-shipping-badge--image" aria-hidden="true">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h11v10H3z" />
                <path d="M14 10h4l3 3v3h-7z" />
                <circle cx="7" cy="18" r="2" />
                <circle cx="18" cy="18" r="2" />
              </svg>
              <span>Envío gratis</span>
            </span>
          )}
          {variants.length > 0 && (
            <span className="product-card-colors-badge">
              {variantBadgeLabel}
            </span>
          )}
          {outOfStock && (
            <span className="product-card-agotado-badge">AGOTADO</span>
          )}
          {/* Quick add button */}
          {hasCardPrice && !outOfStock && (
            <button
              className="product-card-quick-add"
              onClick={handleQuickAdd}
              title="Compra rápida"
              aria-label="Compra rápida"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
              </svg>
            </button>
          )}
        </div>
        <div className="product-card-info">
          <h3 className="product-card-name">{name}</h3>
          {hasFreeShipping && (
            <span className="product-card-free-shipping-badge product-card-free-shipping-badge--mobile" aria-label="Envío gratis">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h11v10H3z" />
                <path d="M14 10h4l3 3v3h-7z" />
                <circle cx="7" cy="18" r="2" />
                <circle cx="18" cy="18" r="2" />
              </svg>
              <span>Envío gratis</span>
            </span>
          )}

          {selectedVariant && (
            <div className="product-card-selected-variant" aria-live="polite">
              Variante: <strong>{selectedVariant.name}</strong>
            </div>
          )}

          {/* Variant swatches */}
          {variants.length > 0 && (
            <div className="product-card-variants">
              {visibleVariants.map((v) => {
                const variantStock = stockMap ? (stockMap[v.id] ?? -1) : (v.stock ?? -1);
                const variantOutOfStock = tracksStock && variantStock === 0;
                return (
                  <button
                    key={v.id}
                    className={`product-card-swatch ${selectedVariant?.id === v.id ? 'product-card-swatch-active' : ''} ${variantOutOfStock ? 'product-card-swatch-agotado' : ''}`}
                    style={{ backgroundColor: v.colorHex || getVariantColor(v.colorName || v.name.split('/')[0].trim()) }}
                    title={variantOutOfStock ? `${v.name} - Agotado` : v.name}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (variantOutOfStock) return;
                      setSelectedVariant(selectedVariant?.id === v.id ? null : v);
                    }}
                    aria-label={v.name}
                    disabled={variantOutOfStock}
                   />
                 );
               })}
              {remainingVariantCount > 0 && (
                <span className="product-card-variants-more">+{remainingVariantCount}</span>
              )}
            </div>
          )}

           {displayedHasPrice && displayedPresentation ? (
             <>
               {showStartingPrice && <div className="product-card-price-from">Desde</div>}
                {displayedPresentation.isOnSale && displayedPresentation.regularPrice != null && displayedPresentation.regularPrice > 0 && (
                 <div className="product-card-price-row product-card-price-transition">
                   <span className="product-card-price-original">{formatPrice(displayedPresentation.regularPrice)}</span>
                   {getDiscountPercent(displayedPresentation.regularPrice, displayedPresentation.finalPrice) != null && (
                     <span className="product-card-discount-text">
                       {getDiscountPercent(displayedPresentation.regularPrice, displayedPresentation.finalPrice)} OFF
                     </span>
                   )}
                 </div>
               )}
               <div className={`product-card-price product-card-price-transition ${displayedPresentation.isOnSale ? 'product-card-price-offer' : ''}`}>
                 {formatPrice(displayedPresentation.finalPrice)}
               </div>
               {priceTransfer && price != null && showTransferPayment && (
                 <div className="product-card-transfer">
                   <span className="product-card-transfer-price">{formatPrice(priceTransfer)}</span>
                   <span className="product-card-transfer-label">Transferencia o depósito</span>
                 </div>
               )}
             </>
           ) : (
             <div className="product-card-price text-gray-500">
                {!displayedHasPrice ? 'Consultar precio' : 'Sin stock'}
             </div>
           )}
        </div>
      </Link>
       {(hasCardPrice || !displayedHasPrice) && (
         <div className="product-card-actions">
           {!displayedHasPrice ? (
             <TrackedWhatsAppLink
               href={consultationHref}
               className="product-card-add-btn product-card-consult-btn"
               target="_blank"
               rel="noopener noreferrer"
               source="price-consultation-product-card"
               productId={id}
             >
               {normalizedWhatsappNumber ? 'CONSULTAR POR WHATSAPP' : 'CONSULTAR PRECIO'}
             </TrackedWhatsAppLink>
           ) : (
             <button
               onClick={handleAddToCart}
               className={`product-card-add-btn ${outOfStock ? 'product-card-add-btn-agotado' : ''}`}
               disabled={outOfStock || requiresVariantSelection || (selectedVariant !== null && !selectedVariantHasPrice)}
             >
               {outOfStock ? 'AGOTADO' : requiresVariantSelection ? 'ELEGÍ UNA VARIANTE' : selectedVariant !== null && !selectedVariantHasPrice ? 'SIN PRECIO' : justAdded ? '✓ AGREGADO' : 'AGREGAR AL CARRITO'}
             </button>
           )}
         </div>
       )}
    </div>
  );
}
