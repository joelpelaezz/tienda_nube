'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';

interface ImageZoomProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  zoomLevel?: number;
  lensSize?: number;
}

export default function ImageZoom({
  src,
  alt,
  className = '',
  containerClassName = '',
  zoomLevel = 2,
  lensSize = 140,
}: ImageZoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLens, setShowLens] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setLensPos({ x, y });
  }, []);

  // Calculate background-position so zoomed image aligns with cursor
  // x% * (zoomLevel - 1) offsets the background to center the cursor area in the lens
  const bgPosX = imgSize.width > 0 ? (lensPos.x / imgSize.width) * (zoomLevel - 1) * 100 : 0;
  const bgPosY = imgSize.height > 0 ? (lensPos.y / imgSize.height) * (zoomLevel - 1) * 100 : 0;

  // Clamp lens so it stays within the container
  const lensLeft = Math.min(Math.max(lensPos.x - lensSize / 2, 0), imgSize.width - lensSize);
  const lensTop = Math.min(Math.max(lensPos.y - lensSize / 2, 0), imgSize.height - lensSize);

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${containerClassName}`}
      style={{ cursor: 'crosshair' }}
      onMouseEnter={() => setShowLens(true)}
      onMouseLeave={() => setShowLens(false)}
      onMouseMove={handleMouseMove}
    >
      {/* Main image */}
      <Image
        src={src}
        alt={alt}
        width={800}
        height={800}
        className={`object-contain w-full h-full ${className}`}
        onLoad={(e) => {
          const img = e.currentTarget;
          setImgSize({ width: img.naturalWidth, height: img.naturalHeight });
          setImgLoaded(true);
        }}
        draggable={false}
        priority
      />

      {/* Zoomed background overlay */}
      {showLens && imgLoaded && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${src})`,
            backgroundSize: `${zoomLevel * 100}%`,
            backgroundPosition: `${bgPosX}% ${bgPosY}%`,
            backgroundRepeat: 'no-repeat',
          }}
        />
      )}

      {/* Lens circle */}
      {showLens && imgLoaded && (
        <div
          className="absolute pointer-events-none rounded-full border-2 border-white shadow-2xl overflow-hidden"
          style={{
            width: lensSize,
            height: lensSize,
            left: lensLeft,
            top: lensTop,
            backgroundImage: `url(${src})`,
            backgroundSize: `${zoomLevel * 100}%`,
            backgroundPosition: `${bgPosX}% ${bgPosY}%`,
            backgroundRepeat: 'no-repeat',
          }}
        />
      )}
    </div>
  );
}
