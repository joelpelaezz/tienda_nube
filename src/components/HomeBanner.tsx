'use client';

import Image from 'next/image';
import { useCallback, useSyncExternalStore } from 'react';
import type { HomeBannerData } from '@/app/admin/configuracion/actions';

interface HomeBannerProps {
  data: HomeBannerData;
}

function useMediaQuery(query: string): boolean {
  const subscribe = useCallback((notify: () => void) => {
    const media = window.matchMedia(query);
    media.addEventListener('change', notify);
    return () => media.removeEventListener('change', notify);
  }, [query]);
  const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export default function HomeBanner({ data }: HomeBannerProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (!data.isActive || !data.desktopUrl) return null;

  const src = isMobile && data.mobileUrl ? data.mobileUrl : data.desktopUrl;
  const alt = data.alt || 'Banner de Tendencia Shop';

  return (
    <div className="home-banner">
      {data.link ? (
        <a href={data.link} className="home-banner-link" target="_blank" rel="noopener noreferrer">
          {/* C4-TRACE: configurable banner URLs bypass the Next remote-host allowlist. */}
          <Image
            src={src}
            alt={alt}
            fill
            unoptimized
            className="home-banner-image"
            priority
            sizes="100vw"
          />
        </a>
      ) : (
        <Image
          src={src}
          alt={alt}
          fill
          unoptimized
          className="home-banner-image"
          priority
          sizes="100vw"
        />
      )}
    </div>
  );
}
