'use client';

import { useCartStore } from '@/lib/store';

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
}: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const openCart = useCartStore((state) => state.openCart);

  const handleAddToCart = async () => {
    const variant = variants.find((v) => v.id === selectedVariantId);

    // Stock validation
    if (selectedVariantId != null) {
      const stock = stockMap[selectedVariantId];
      if (stock !== undefined && stock === 0) {
        alert('Sin stock');
        return;
      }
      if (stock !== undefined && stock > 0) {
        addItem({
          id: productId,
          slug: productSlug,
          name: productName,
          price: productPrice,
          variant: variant?.name || undefined,
          variantId: selectedVariantId,
          imageUrl: productImageUrl,
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
    });
    openCart();
  };

  return (
    <button onClick={handleAddToCart} className="add-to-cart-btn">
      AGREGAR AL CARRITO
    </button>
  );
}
