import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HOME_CAROUSEL_SLIDES,
  getActiveHomeCarouselSlides,
  normalizeHomeCarouselSlides,
  validateHomeCarouselSlides,
  type HomeCarouselSlide,
} from './home-carousel';

// C4-TRACE: regression coverage for admin carousel validation, activation, and ordering.
describe('home carousel slides', () => {
  it('keeps the legacy homepage images as initial editable slides', () => {
    expect(DEFAULT_HOME_CAROUSEL_SLIDES.map((slide) => slide.imageUrl)).toEqual([
      '/images/slide-capibara.webp',
      '/images/BannerCapibara.jpg',
    ]);
  });

  it('renders only active slides with an image while preserving their configured order', () => {
    const slides: HomeCarouselSlide[] = [
      { ...DEFAULT_HOME_CAROUSEL_SLIDES[1], isActive: true },
      { ...DEFAULT_HOME_CAROUSEL_SLIDES[0], isActive: true },
      { ...DEFAULT_HOME_CAROUSEL_SLIDES[0], id: 'draft', imageUrl: '', isActive: false },
    ];

    expect(getActiveHomeCarouselSlides(slides).map((slide) => slide.id)).toEqual(['banner-capibara', 'slide-capibara']);
  });

  it('requires an image for active slides but permits an empty inactive draft', () => {
    const draft = { ...DEFAULT_HOME_CAROUSEL_SLIDES[0], imageUrl: '', isActive: false };
    expect(validateHomeCarouselSlides([draft])).toBeNull();
    expect(validateHomeCarouselSlides([{ ...draft, isActive: true }])).toContain('necesita una imagen desktop');
  });

  it('rejects unsafe protocols, duplicate identifiers, and more than ten slides', () => {
    expect(validateHomeCarouselSlides([
      { ...DEFAULT_HOME_CAROUSEL_SLIDES[0], link: 'javascript:alert(1)' },
    ])).toContain('URL HTTPS');

    expect(validateHomeCarouselSlides([
      DEFAULT_HOME_CAROUSEL_SLIDES[0],
      { ...DEFAULT_HOME_CAROUSEL_SLIDES[1], id: DEFAULT_HOME_CAROUSEL_SLIDES[0].id },
    ])).toContain('identificador único');

    expect(validateHomeCarouselSlides(Array.from({ length: 11 }, (_, index) => ({
      ...DEFAULT_HOME_CAROUSEL_SLIDES[0],
      id: `slide-${index}`,
    })))).toContain('hasta 10');
  });

  it('normalizes configured slide text before persistence', () => {
    const normalized = normalizeHomeCarouselSlides([{
      ...DEFAULT_HOME_CAROUSEL_SLIDES[0],
      imageUrl: ' /images/hero.jpg ',
      alt: ' Hero ',
    }]);

    expect(normalized[0]).toMatchObject({ imageUrl: '/images/hero.jpg', alt: 'Hero' });
  });
});
