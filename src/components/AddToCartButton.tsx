'use client';

import { useCartStore } from '@/lib/store';
import TrackedWhatsAppLink from './TrackedWhatsAppLink';

interface AddToCartButtonProps {
  productId: number;
  productName: string;
  productSlug: string;
  productPrice: number;
  productImageUrl: string;
  variants: Array<{ id: number; name: string }>;
  selectedVariantId: number | null;
  onVariantChange: (variantId: number) => void;
  stockMap?: Record<number, number>;  // NEW
  disabled?: boolean;
  disabledLabel?: string;
  outOfStock?: boolean;
  consultForPrice?: boolean;
  requestHref: string;
  requestLabel?: string;
  availableStock?: number | null;
  transferPrice?: number | null;
}

export default function AddToCartButton({
  productId,
  productName,
  productSlug,
  productPrice,
  productImageUrl,
  variants,
  selectedVariantId,
  onVariantChange,
  stockMap = {},
  disabled = false,
  disabledLabel = 'NO DISPONIBLE',
  outOfStock = false,
  consultForPrice = false,
  requestHref,
  requestLabel = 'Solicitar por WhatsApp',
  availableStock,
  transferPrice,
}: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  const handleAddToCart = async () => {
    if (disabled || outOfStock) return;
    const variant = variants.find((v) => v.id === selectedVariantId);

    // Stock validation
    if (selectedVariantId != null) {
      const stock = stockMap[selectedVariantId];
      if (stock !== undefined && stock > 0) {
        addItem({
          id: productId,
          slug: productSlug,
          name: productName,
          price: productPrice,
          variant: variant?.name || undefined,
          variantId: selectedVariantId,
          imageUrl: productImageUrl,
          transferPrice: null,
          availableStock: stock,
        });
        openCart();
        return;
      }
    }

    // No stock info available — add anyway (backwards compatible)
    addItem({
      id: productId,
      slug: productSlug,
      name: productName,
      price: productPrice,
      variant: variant?.name || undefined,
      variantId: selectedVariantId ?? undefined,
      imageUrl: productImageUrl,
      transferPrice: selectedVariantId == null ? transferPrice ?? null : null,
      availableStock: availableStock ?? null,
    });
    openCart();
  };

  // C4-TRACE: route non-sellable products to consultation instead of a disabled purchase action.
  if (consultForPrice) {
    return (
      <TrackedWhatsAppLink
        href={requestHref}
        className="add-to-cart-btn add-to-cart-btn--request"
        target="_blank"
        rel="noopener noreferrer"
        source="price-consultation-product-detail"
        productId={productId}
      >
        {requestLabel}
      </TrackedWhatsAppLink>
    );
  }

  if (outOfStock) {
    return (
      <TrackedWhatsAppLink
        href={requestHref}
        className="add-to-cart-btn add-to-cart-btn--request"
        target="_blank"
        rel="noopener noreferrer"
        source="out-of-stock-product-request"
        productId={productId}
      >
        {requestLabel}
      </TrackedWhatsAppLink>
    );
  }

  return (
    <button onClick={handleAddToCart} className="add-to-cart-btn" disabled={disabled}>
      {disabled ? disabledLabel : 'AGREGAR AL CARRITO'}
    </button>
  );
}
