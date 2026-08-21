'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { useCartStore, useQuickShopStore } from '@/lib/store';
import { formatPrice } from '@/lib/utils/format';
import type { ProductCardData, ProductVariant } from '@/types/product';

// Map variant names to approximate hex colors
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

export default function ProductCard({
  id,
  slug,
  name,
  price,
  priceOffer,
  priceTransfer,
  discount,
  badge,
  imageUrl,
  variants = [],
}: ProductCardData) {
  const addItem = useCartStore((s) => s.addItem);
  const openQuickShop = useQuickShopStore((s) => s.openQuickShop);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const finalPrice = selectedVariant?.price || priceOffer || price;
    if (finalPrice) {
      addItem({
        id,
        slug,
        name,
        price: finalPrice,
        imageUrl,
        variant: selectedVariant?.name,
      });
    }
  };

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openQuickShop({
      id,
      name,
      slug,
      price: priceOffer || price || 0,
      priceOffer,
      imageUrl,
      variants: variants.map(v => ({ id: v.id, name: v.name, price: v.price })),
    });
  };

  return (
    <div className="product-card">
      <Link href={`/productos/${slug}/`}>
        <div className="product-card-image">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              fill
              sizes="(max-width: 480px) 100vw, (max-width: 768px) 50vw, 25vw"
              className="object-contain"
              priority={false}
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full bg-gray-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 80 80"
                className="w-16 h-16 text-gray-300"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <rect x="10" y="15" width="60" height="50" rx="4" />
                <circle cx="28" cy="35" r="7" />
                <path d="M10 55 L30 40 L45 52 L58 42 L70 55" />
              </svg>
            </div>
          )}
          {(badge || discount) && (
            <span className="product-card-oferta-badge">OFERTA</span>
          )}
          {variants.length > 0 && (
            <span className="product-card-colors-badge">
              {variants.length} colores
            </span>
          )}
          {/* Quick add button */}
          {price !== null && (
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

          {/* Variant swatches */}
          {variants.length > 0 && (
            <div className="product-card-variants">
              {variants.map((v) => (
                <button
                  key={v.id}
                  className={`product-card-swatch ${selectedVariant?.id === v.id ? 'product-card-swatch-active' : ''}`}
                  style={{ backgroundColor: getVariantColor(v.name) }}
                  title={v.name}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedVariant(selectedVariant?.id === v.id ? null : v);
                  }}
                  aria-label={v.name}
                />
              ))}
            </div>
          )}

          {price !== null ? (
            <>
              {priceOffer ? (
                <>
                  <div className="product-card-price-row">
                    <span className="product-card-price-original">
                      {formatPrice(price)}
                    </span>
                    {discount && (
                      <span className="product-card-discount-text">{discount} OFF</span>
                    )}
                  </div>
                  <div className="product-card-price product-card-price-offer">
                    {formatPrice(selectedVariant?.price || priceOffer)}
                  </div>
                </>
              ) : (
                <div className="product-card-price">{formatPrice(selectedVariant?.price || price)}</div>
              )}
              {priceTransfer && (
                <div className="product-card-transfer">
                  {formatPrice(priceTransfer)} con Transferencia o depósito
                </div>
              )}
            </>
          ) : (
            <div className="product-card-price text-gray-500">Consultar precio</div>
          )}
        </div>
      </Link>
      {price !== null && (
        <div className="product-card-actions">
          <button
            onClick={handleAddToCart}
            className="product-card-add-btn"
          >
            AGREGAR AL CARRITO
          </button>
        </div>
      )}
    </div>
  );
}
