'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface Slide {
  image: string;
  alt: string;
  link?: string;
}

const slides: Slide[] = [
  {
    image: '/images/slide-capibara.webp',
    alt: 'Tendencia Shop - Mundo Capibara',
    link: '/productos',
  },
  {
    image: '/images/BannerCapibara.jpg',
    alt: 'Tendencia Shop - Ofertas especiales',
    link: '/productos',
  },
];

export default function HomeCarousel() {
  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [isAutoPlaying, next]);

  return (
    <div
      className="home-carousel"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      <div className="home-carousel-track">
        {slides.map((slide, i) => (
          <div
            key={i}
            className={`home-carousel-slide ${i === current ? 'home-carousel-slide-active' : ''}`}
          >
            {slide.link ? (
              <a href={slide.link}>
                <Image
                  src={slide.image}
                  alt={slide.alt}
                  fill
                  className="home-carousel-image"
                  priority={i === 0}
                />
              </a>
            ) : (
              <Image
                src={slide.image}
                alt={slide.alt}
                fill
                className="home-carousel-image"
                priority={i === 0}
              />
            )}
          </div>
        ))}
      </div>

      {/* Arrows */}
      <button
        className="home-carousel-arrow home-carousel-arrow-left"
        onClick={prev}
        aria-label="Anterior"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        className="home-carousel-arrow home-carousel-arrow-right"
        onClick={next}
        aria-label="Siguiente"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* Dots */}
      <div className="home-carousel-dots">
        {slides.map((_, i) => (
          <button
            key={i}
            className={`home-carousel-dot ${i === current ? 'home-carousel-dot-active' : ''}`}
            onClick={() => setCurrent(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
