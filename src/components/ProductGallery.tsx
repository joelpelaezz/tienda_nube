'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import ImageZoom from './ImageZoom';

interface ProductGalleryProps {
  images: Array<{ url: string; alt: string | null }>;
  productName: string;
  badge?: string | null;
  discount?: string | null;
  priceOffer?: number | null;
}

export default function ProductGallery({ images, productName, badge, discount, priceOffer }: ProductGalleryProps) {
  const [activeImageUrl, setActiveImageUrl] = useState<string | null>(images[0]?.url ?? null);

  useEffect(() => {
    const handleVariantImage = (event: Event) => {
      const url = (event as CustomEvent<{ url?: string }>).detail?.url;
      setActiveImageUrl(url || images[0]?.url || null);
    };
    window.addEventListener('product-variant-image', handleVariantImage);
    return () => window.removeEventListener('product-variant-image', handleVariantImage);
  }, [images]);

  if (images.length === 0) {
    return null;
  }

  const mainImage = images.find((image) => image.url === activeImageUrl)
    || (activeImageUrl ? { url: activeImageUrl, alt: productName } : images[0]);

  return (
    <div className="detalle-gallery">
      <div className="detalle-main-image">
        {mainImage && (
          <ImageZoom
            src={mainImage.url}
            alt={mainImage.alt || productName}
            containerClassName="w-full h-full"
            zoomLevel={2}
            lensSize={140}
          />
        )}
        {priceOffer !== null && priceOffer !== undefined && priceOffer > 0 && (
          <span className="detalle-oferta-badge">OFERTA</span>
        )}
      </div>

      {images.length > 1 && (
        <div className="detalle-thumbnails">
          {images.map((img, index) => (
            <button
              key={index}
              type="button"
              className={`detalle-thumbnail ${img.url === activeImageUrl ? 'detalle-thumbnail--active' : ''}`}
              onClick={() => setActiveImageUrl(img.url)}
              title={img.alt || `${productName} - imagen ${index + 1}`}
              aria-label={`Ver imagen ${index + 1}`}
            >
              <Image
                src={img.url}
                alt={img.alt || `${productName} - imagen ${index + 1}`}
                fill
                className="object-contain"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
