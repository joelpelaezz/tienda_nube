'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { getActiveHomeCarouselSlides, type HomeCarouselSlide } from '@/lib/home-carousel';

interface HomeCarouselProps {
  slides: HomeCarouselSlide[];
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 768px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isMobile;
}

// C4-TRACE: render the active, ordered slides loaded from admin configuration.
export default function HomeCarousel({ slides }: HomeCarouselProps) {
  const activeSlides = getActiveHomeCarouselSlides(slides);
  const isMobile = useIsMobile();
  const [current, setCurrent] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const safeCurrent = activeSlides.length > 0 ? current % activeSlides.length : 0;

  const next = useCallback(() => {
    if (activeSlides.length > 1) setCurrent((previous) => (previous + 1) % activeSlides.length);
  }, [activeSlides.length]);

  const prev = useCallback(() => {
    if (activeSlides.length > 1) setCurrent((previous) => (previous - 1 + activeSlides.length) % activeSlides.length);
  }, [activeSlides.length]);

  useEffect(() => {
    if (current >= activeSlides.length) setCurrent(0);
  }, [activeSlides.length, current]);

  useEffect(() => {
    if (!isAutoPlaying || activeSlides.length < 2) return;
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [activeSlides.length, isAutoPlaying, next]);

  if (activeSlides.length === 0) return null;

  return (
    <div
      className="home-carousel"
      onMouseEnter={() => setIsAutoPlaying(false)}
      onMouseLeave={() => setIsAutoPlaying(true)}
    >
      <div className="home-carousel-track">
        {activeSlides.map((slide, index) => {
          const imageUrl = isMobile && slide.mobileImageUrl ? slide.mobileImageUrl : slide.imageUrl;
          const alt = slide.alt || `Slide ${index + 1} de Tendencia Shop`;
          return (
            <div
              key={slide.id}
              className={`home-carousel-slide ${index === safeCurrent ? 'home-carousel-slide-active' : ''}`}
            >
              {slide.link ? (
                <a href={slide.link}>
                  <Image
                    src={imageUrl}
                    alt={alt}
                    fill
                    unoptimized
                    className="home-carousel-image"
                    priority={index === 0}
                  />
                </a>
              ) : (
                <Image
                  src={imageUrl}
                  alt={alt}
                  fill
                  unoptimized
                  className="home-carousel-image"
                  priority={index === 0}
                />
              )}
            </div>
          );
        })}
      </div>

      {activeSlides.length > 1 && <>
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

        <div className="home-carousel-dots">
          {activeSlides.map((slide, index) => (
            <button
              key={slide.id}
              className={`home-carousel-dot ${index === safeCurrent ? 'home-carousel-dot-active' : ''}`}
              onClick={() => setCurrent(index)}
              aria-label={`Slide ${index + 1}`}
            />
          ))}
        </div>
      </>}
    </div>
  );
}
