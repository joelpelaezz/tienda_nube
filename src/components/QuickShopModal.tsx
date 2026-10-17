'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useCartStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils/format';
import { getPricePresentation } from '@/lib/products/pricing';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: number;
  priceOffer?: number | null;
  imageUrl: string | null;
  variants?: Array<{ id: number; name: string; price?: number | null; priceOffer?: number | null }>;
}

interface QuickShopModalProps {
  product: Product | null;
  onClose: () => void;
}

const COLOR_MAP: Record<string, string> = {
  'rosa': '#F8BBD0',
  'azul': '#42A5F5',
  'celeste': '#81D4FA',
  'marrón': '#8D6E63',
  'beige': '#D7CCC8',
  'amarillo': '#FDD835',
  'rojo': '#EF5350',
  'verde': '#66BB6A',
  'negro': '#212121',
  'blanco': '#FAFAFA',
  'gris': '#9E9E9E',
  'naranja': '#FF7043',
  'morado': '#AB47BC',
  'turquesa': '#26C6DA',
};

function getVariantColor(name: string): string {
  return COLOR_MAP[name.toLowerCase()] || '#9E9E9E';
}

export default function QuickShopModal({ product, onClose }: QuickShopModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const addItem = useCartStore((s) => s.addItem);

  useEffect(() => {
    if (product?.variants && product.variants.length > 0) {
      setSelectedVariant(product.variants[0].id);
    }
    setQuantity(1);
    setAdded(false);
  }, [product]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!product) return null;

  const handleAddToCart = () => {
    const variant = product.variants?.find(v => v.id === selectedVariant);
    const finalPrice = getPricePresentation({ regularPrice: product.price, offerPrice: product.priceOffer, variantRegularPrice: variant?.price, variantOfferPrice: variant?.priceOffer }).finalPrice ?? 0;

    addItem({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: finalPrice,
      imageUrl: product.imageUrl,
      variant: variant?.name,
      variantId: selectedVariant,
      quantity,
    });

    setAdded(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const selectedVariantData = product.variants?.find(v => v.id === selectedVariant);
  const presentation = getPricePresentation({ regularPrice: product.price, offerPrice: product.priceOffer, variantRegularPrice: selectedVariantData?.price, variantOfferPrice: selectedVariantData?.priceOffer });
  const finalPrice = presentation.finalPrice ?? 0;

  return (
    <div className="quickshop-overlay" onClick={onClose}>
      <div className="quickshop-modal" onClick={e => e.stopPropagation()}>
        <button className="quickshop-close" onClick={onClose} aria-label="Cerrar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="quickshop-content">
          <div className="quickshop-image">
            {product.imageUrl ? (
              <Image
                src={product.imageUrl}
                alt={product.name}
                fill
                className="object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">Sin foto</div>
            )}
          </div>

          <div className="quickshop-info">
            <h3 className="quickshop-title">{product.name}</h3>

            <div className="quickshop-price">
              {presentation.isOnSale ? (
                <>
                  <span className="quickshop-price-original">{formatPrice(presentation.regularPrice ?? product.price)}</span>
                  <span className="quickshop-price-offer">{formatPrice(finalPrice)}</span>
                </>
              ) : (
                <span className="quickshop-price-current">{formatPrice(finalPrice)}</span>
              )}
            </div>

            {/* Variant selector */}
            {product.variants && product.variants.length > 0 && (
              <div className="quickshop-variants">
                <span className="quickshop-variant-label">
                  Color: {product.variants.find(v => v.id === selectedVariant)?.name}
                </span>
                <div className="quickshop-variant-swatches">
                  {product.variants.map(variant => (
                    <button
                      key={variant.id}
                      className={`quickshop-swatch ${selectedVariant === variant.id ? 'quickshop-swatch-active' : ''}`}
                      style={{ backgroundColor: getVariantColor(variant.name) }}
                      onClick={() => setSelectedVariant(variant.id)}
                      title={variant.name}
                      aria-label={variant.name}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="quickshop-quantity">
              <label className="quickshop-quantity-label">Cantidad:</label>
              <div className="quickshop-quantity-controls">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="quickshop-qty-btn"
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <span className="quickshop-qty-value">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="quickshop-qty-btn"
                >
                  +
                </button>
              </div>
            </div>

            {/* Add to cart */}
            <button
              onClick={handleAddToCart}
              className={`quickshop-add-btn ${added ? 'quickshop-add-btn-success' : ''}`}
            >
              {added ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  ¡Agregado!
                </>
              ) : (
                'AGREGAR AL CARRITO'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
