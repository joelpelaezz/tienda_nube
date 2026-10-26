'use client';

import { useCallback, useState } from 'react';
import VariantSelector from './VariantSelector';
import AddToCartButton from './AddToCartButton';
import { getPricePresentation, isSellablePrice } from '@/lib/products/pricing';
import { formatPrice } from '@/lib/utils/format';

interface Variant {
  id: number;
  name: string;
  price?: number | null;
  priceOffer?: number | null;
  stock?: number | null;
  optionIds?: string[];
  variantTypeId?: number | null;
  imageUrl?: string | null;
}

interface ProductActionsProps {
  productId: number;
  productName: string;
  productSlug: string;
  productPrice: number | null;
  productPriceOffer?: number | null;
  productTransferPrice?: number | null;
  productImageUrl: string;
  variants: Variant[];
  stockMap?: Record<number, number>;  // NEW
  productStock: number;
  productType: string;
  whatsappNumber: string;
}

export default function ProductActions({
  productId,
  productName,
  productSlug,
  productPrice,
  productPriceOffer = null,
  productTransferPrice = null,
  productImageUrl,
  variants,
  stockMap = {},
  productStock,
  productType,
  whatsappNumber,
}: ProductActionsProps) {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    variants.length > 0 ? variants[0] : null
  );
  const presentation = getPricePresentation({
    regularPrice: productPrice,
    offerPrice: productPriceOffer,
    variantRegularPrice: selectedVariant?.price,
    variantOfferPrice: selectedVariant?.priceOffer,
  });
  const finalPrice = presentation.finalPrice ?? 0;
  // C4-TRACE: zero/null effective price uses the consultation path, not add-to-cart.
  const isSellable = isSellablePrice(presentation.finalPrice);
  const tracksStock = productType !== 'digital';
  const selectedStock = selectedVariant
    ? stockMap[selectedVariant.id] ?? selectedVariant.stock ?? undefined
    : variants.length === 0 ? productStock : undefined;
  const availableStock = tracksStock ? selectedStock : null;
  const isOutOfStock = tracksStock && selectedStock === 0;
  const needsVariantSelection = variants.length > 0 && selectedVariant == null;
  const startingVariantPrice = variants
    .map((variant) => getPricePresentation({
      regularPrice: productPrice,
      offerPrice: productPriceOffer,
      variantRegularPrice: variant.price,
      variantOfferPrice: variant.priceOffer,
    }).finalPrice)
    .filter(isSellablePrice)
    .sort((a, b) => a - b)[0];
  const hasSellableVariantPrice = startingVariantPrice != null;

  const selectVariant = useCallback((variant: Variant | null) => {
    setSelectedVariant(variant);
    window.dispatchEvent(new CustomEvent('product-variant-image', { detail: { url: variant?.imageUrl || null } }));
  }, []);
  const handleVariantPriceChange = useCallback(() => undefined, []);
  const requestMessage = !isSellable
    ? `Hola, quiero consultar el precio de ${productName}${selectedVariant ? `, variante ${selectedVariant.name}` : ''}.`
    : selectedVariant
      ? `Hola, quiero solicitar ${productName}, variante ${selectedVariant.name}. ¿Es posible encargarla?`
      : `Hola, quiero consultar por ${productName}.`;
  const normalizedWhatsappNumber = whatsappNumber.replace(/\D/g, '');
  const requestHref = normalizedWhatsappNumber
    ? `https://wa.me/${normalizedWhatsappNumber}?text=${encodeURIComponent(requestMessage)}`
    : `/contacto?producto=${encodeURIComponent(productSlug)}&variante=${encodeURIComponent(selectedVariant?.name ?? '')}`;

  return (
    <>
      {variants.length > 0 && (
        <VariantSelector
          variants={variants}
          selectedVariantId={selectedVariant?.id}
           onSelect={selectVariant}
            onPriceChange={handleVariantPriceChange}
           stockMap={stockMap}
         />
      )}
      {variants.length > 0 && (
        <div className="detalle-prices detalle-selected-prices" aria-live="polite">
          {!selectedVariant && startingVariantPrice != null ? (
            <div className="detalle-price-single">Desde {formatPrice(startingVariantPrice)}</div>
          ) : presentation.isOnSale && presentation.regularPrice != null && presentation.regularPrice > 0 ? (
            <div className="detalle-price-original">{formatPrice(presentation.regularPrice)}</div>
          ) : null}
          {!(needsVariantSelection && hasSellableVariantPrice) && (
            <div className={presentation.isOnSale ? 'detalle-price-offer' : 'detalle-price-single'}>
              {isSellable ? formatPrice(finalPrice) : 'Consultar precio'}
            </div>
          )}
        </div>
      )}
      {isOutOfStock && (
        <p className="detalle-stock-status" role="status" aria-live="polite">
          {selectedVariant ? `Sin stock para ${selectedVariant.name}` : 'Sin stock para este producto'}
        </p>
      )}
      {!isOutOfStock && tracksStock && selectedStock != null && selectedStock > 0 && (
        <p className="detalle-stock-status detalle-stock-status--available" role="status" aria-live="polite">
          Disponible
        </p>
      )}
      <AddToCartButton
        productId={productId}
        productName={productName}
        productSlug={productSlug}
        productPrice={finalPrice}
        productImageUrl={selectedVariant?.imageUrl || productImageUrl}
        variants={variants.map((v) => ({ id: v.id, name: v.name }))}
        selectedVariantId={selectedVariant?.id ?? null}
        onVariantChange={(id) => {
           const v = variants.find((v) => v.id === id);
           if (v) selectVariant(v);
        }}
        stockMap={stockMap}
        outOfStock={isOutOfStock}
         requestHref={requestHref}
         requestLabel={!isSellable
           ? normalizedWhatsappNumber ? 'Consultar precio por WhatsApp' : 'Consultar precio'
           : normalizedWhatsappNumber ? 'Solicitar por WhatsApp' : 'Consultar disponibilidad'}
         availableStock={availableStock}
         transferPrice={variants.length === 0 ? productTransferPrice : null}
          disabled={!isSellable || needsVariantSelection}
          consultForPrice={!isSellable && (!needsVariantSelection || !hasSellableVariantPrice)}
         disabledLabel={needsVariantSelection ? 'ELEGÍ UNA VARIANTE' : 'SIN PRECIO'}
      />
    </>
  );
}
