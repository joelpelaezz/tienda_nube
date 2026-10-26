export interface HomeCarouselSlide {
  id: string;
  imageUrl: string;
  mobileImageUrl: string;
  link: string;
  alt: string;
  isActive: boolean;
}

export const MAX_HOME_CAROUSEL_SLIDES = 10;

// C4-TRACE: preserve the current homepage carousel as editable admin defaults.
export const DEFAULT_HOME_CAROUSEL_SLIDES: HomeCarouselSlide[] = [
  {
    id: 'slide-capibara',
    imageUrl: '/images/slide-capibara.webp',
    mobileImageUrl: '',
    alt: 'Tendencia Shop - Mundo Capibara',
    link: '/productos',
    isActive: true,
  },
  {
    id: 'banner-capibara',
    imageUrl: '/images/BannerCapibara.jpg',
    mobileImageUrl: '',
    alt: 'Tendencia Shop - Ofertas especiales',
    link: '/productos',
    isActive: true,
  },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeCarouselUrl(value: string): boolean {
  if (!value) return true;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function validateHomeCarouselSlides(value: unknown): string | null {
  if (!Array.isArray(value)) return 'La configuración del carrusel no es válida.';
  if (value.length > MAX_HOME_CAROUSEL_SLIDES) {
    return `El carrusel admite hasta ${MAX_HOME_CAROUSEL_SLIDES} slides.`;
  }

  const ids = new Set<string>();
  for (let index = 0; index < value.length; index += 1) {
    const candidate: unknown = value[index];
    if (!isRecord(candidate)) return `El slide ${index + 1} no es válido.`;
    if (
      typeof candidate.id !== 'string' ||
      typeof candidate.imageUrl !== 'string' ||
      typeof candidate.mobileImageUrl !== 'string' ||
      typeof candidate.link !== 'string' ||
      typeof candidate.alt !== 'string' ||
      typeof candidate.isActive !== 'boolean'
    ) {
      return `El slide ${index + 1} no tiene todos sus campos válidos.`;
    }
    const id = candidate.id.trim();
    const imageUrl = candidate.imageUrl.trim();
    const mobileImageUrl = candidate.mobileImageUrl.trim();
    const link = candidate.link.trim();
    const alt = candidate.alt.trim();
    const isActive = candidate.isActive === true;

    if (!id || ids.has(id)) return 'Cada slide debe tener un identificador único.';
    ids.add(id);
    if (isActive && !imageUrl) return `El slide ${index + 1} necesita una imagen desktop.`;
    if (imageUrl.length > 2048 || mobileImageUrl.length > 2048 || !isSafeCarouselUrl(imageUrl) || !isSafeCarouselUrl(mobileImageUrl)) {
      return `La URL de imagen del slide ${index + 1} no es válida.`;
    }
    if (link.length > 2048 || !isSafeCarouselUrl(link)) {
      return `El link del slide ${index + 1} debe ser una URL HTTPS o una ruta interna.`;
    }
    if (alt.length > 250) return `El texto alternativo del slide ${index + 1} no puede superar los 250 caracteres.`;
  }

  return null;
}

export function normalizeHomeCarouselSlides(value: unknown): HomeCarouselSlide[] {
  const error = validateHomeCarouselSlides(value);
  if (error) throw new Error(error);
  return (value as HomeCarouselSlide[]).map((slide) => ({
    id: slide.id.trim(),
    imageUrl: slide.imageUrl.trim(),
    mobileImageUrl: slide.mobileImageUrl.trim(),
    link: slide.link.trim(),
    alt: slide.alt.trim(),
    isActive: slide.isActive === true,
  }));
}

export function getActiveHomeCarouselSlides(slides: HomeCarouselSlide[]): HomeCarouselSlide[] {
  return slides.filter((slide) => slide.isActive && slide.imageUrl.trim());
}
