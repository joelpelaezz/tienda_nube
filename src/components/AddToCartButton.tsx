'use client';

import { useState } from 'react';
import { useCartStore } from '@/lib/store';

interface AddToCartButtonProps {
  productId: number;
  productName: string;
  productSlug: string;
  productPrice: number;
  productImageUrl: string;
  variants: Array<{ id: number; name: string }>;
}

export default function AddToCartButton({
  productId,
  productName,
  productSlug,
  productPrice,
  productImageUrl,
  variants,
}: AddToCartButtonProps) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(
    variants.length > 0 ? variants[0].name : null
  );
  const addItem = useCartStore((state) => state.addItem);

  const handleAddToCart = () => {
    addItem({
      id: productId,
      slug: productSlug,
      name: productName,
      price: productPrice,
      variant: selectedVariant || undefined,
      imageUrl: productImageUrl,
    });
  };

  return (
    <button onClick={handleAddToCart} className="add-to-cart-btn">
      AGREGAR AL CARRITO
    </button>
  );
}
