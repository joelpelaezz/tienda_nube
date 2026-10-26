# DESIGN: Home Banner Configurable

## Arquitectura

```
Admin (/admin/configuracion)
└── actions.ts
    ├── getHomeBanner()  ← lee settings
    └── saveHomeBanner() ← upsert settings

Frontend
├── HomeBanner.tsx      ← Client Component
└── page.tsx            ← importa HomeBanner + HomeCarousel
```

---

## Server Actions

```typescript
// settings keys
const BANNER_KEYS = {
  DESKTOP: 'home_banner_desktop',
  MOBILE:  'home_banner_mobile',
  LINK:    'home_banner_link',
  ALT:     'home_banner_alt',
  ACTIVE:  'home_banner_active',
};

export type HomeBannerData = {
  desktopUrl: string;
  mobileUrl: string;
  link: string;
  alt: string;
  isActive: boolean;
};

export async function getHomeBanner(): Promise<HomeBannerData> {
  const rows = await db.select().from(settings);
  const map = Object.fromEntries(rows.map(r => [r.key, r.value]));
  return {
    desktopUrl: map[BANNER_KEYS.DESKTOP] || '',
    mobileUrl:  map[BANNER_KEYS.MOBILE]  || '',
    link:      map[BANNER_KEYS.LINK]     || '',
    alt:       map[BANNER_KEYS.ALT]      || '',
    isActive:  map[BANNER_KEYS.ACTIVE] === 'true',
  };
}

export async function saveHomeBanner(data: HomeBannerData): Promise<void> {
  const entries = [
    [BANNER_KEYS.DESKTOP, data.desktopUrl],
    [BANNER_KEYS.MOBILE,  data.mobileUrl],
    [BANNER_KEYS.LINK,     data.link],
    [BANNER_KEYS.ALT,      data.alt],
    [BANNER_KEYS.ACTIVE,   String(data.isActive)],
  ];
  for (const [key, value] of entries) {
    await db.insert(settings).values({ key, value })
      .onConflictDoUpdate({ target: settings.key, set: { value } });
  }
}
```

---

## Admin UI

Nueva sección en `/admin/configuracion/page.tsx`:

```
┌─────────────────────────────────────────────────────┐
│ Banner del homepage                                 │
│                                                     │
│ [✓] Activar banner en el homepage                  │
│                                                     │
│ Imagen desktop (URL)      [___________________]    │
│ Imagen mobile (URL)       [___________________]    │
│ Link de destino           [___________________]    │
│ Texto alternativo (alt)   [___________________]    │
│                                                     │
│ Preview:                                           │
│ ┌─────────────────────────────────────────────┐   │
│ │  [imagen]                                   │   │
│ └─────────────────────────────────────────────┘   │
│                                                     │
│ [Guardar cambios]                                  │
└─────────────────────────────────────────────────────┘
```

---

## HomeBanner Component

```tsx
'use client';

import Image from 'next/image';

interface HomeBannerProps {
  data: HomeBannerData;
}

export default function HomeBanner({ data }: HomeBannerProps) {
  if (!data.isActive || !data.desktopUrl) return null;

  const src = useMediaQuery('(max-width: 768px)')
    ? (data.mobileUrl || data.desktopUrl)
    : data.desktopUrl;

  return (
    <div className="home-banner">
      {data.link ? (
        <a href={data.link} className="home-banner-link">
          <Image src={src} alt={data.alt} fill className="home-banner-image" />
        </a>
      ) : (
        <Image src={src} alt={data.alt} fill className="home-banner-image" />
      )}
    </div>
  );
}
```

**CSS:**
```css
.home-banner {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 5;
  overflow: hidden;
  background: var(--color-bg-muted);
}
.home-banner-image {
  object-fit: cover;
}
@media (max-width: 768px) {
  .home-banner { aspect-ratio: 4 / 3; }
}
```

---

## Homepage Integration

```tsx
// src/app/page.tsx
import HomeBanner from '@/components/HomeBanner';
import { getHomeBanner } from '@/app/admin/configuracion/actions';

export default async function HomePage() {
  const banner = await getHomeBanner();

  return (
    <>
      <Header />
      <CartDrawer />
      <main>
        {banner.isActive && banner.desktopUrl ? (
          <HomeBanner data={banner} />
        ) : (
          <HomeCarousel />
        )}
        {/* rest of homepage */}
      </main>
      <Footer />
    </>
  );
}
```

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/app/admin/configuracion/actions.ts` | Agregar `getHomeBanner()`, `saveHomeBanner()` |
| `src/app/admin/configuracion/page.tsx` | Agregar sección de configuración del banner |
| `src/components/HomeBanner.tsx` | **NUEVO** — client component del banner |
| `src/app/page.tsx` | Importar `HomeBanner`, condicional con `HomeCarousel` |
| `src/app/globals.css` | Estilos `.home-banner` |

---

## Dependencias

- `next/image` — ya usado en el proyecto
- `useMediaQuery` — custom hook o `window.matchMedia` en useEffect
- No se necesitan librerías nuevas
