'use client';

import { useState } from 'react';
import VariantSelector from './VariantSelector';
import AddToCartButton from './AddToCartButton';

interface Variant {
  id: number;
  name: string;
  price?: number | null;
}

interface ProductActionsProps {
  productId: number;
  productName: string;
  productSlug: string;
  productPrice: number;
  productImageUrl: string;
  variants: Variant[];
}

export default function ProductActions({
  productId,
  productName,
  productSlug,
  productPrice,
  productImageUrl,
  variants,
}: ProductActionsProps) {
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(
    variants.length > 0 ? variants[0] : null
  );

  const finalPrice = selectedVariant?.price || productPrice;

  return (
    <>
      {variants.length > 0 && (
        <VariantSelector
          variants={variants}
          selectedVariantId={selectedVariant?.id}
          onSelect={setSelectedVariant}
        />
      )}
      <AddToCartButton
        productId={productId}
        productName={productName}
        productSlug={productSlug}
        productPrice={finalPrice}
        productImageUrl={productImageUrl}
        variants={variants.map(v => ({ id: v.id, name: v.name }))}
      />
    </>
  );
}
