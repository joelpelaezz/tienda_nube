# Proposal: Home Banner Configurable

## Intent

Permitir que el administrador configure el banner del homepage (imagen desktop + imagen mobile + link) desde el panel de admin, sin necesidad de cambiar código ni redeployar.

## Scope

### In Scope
- Admin: nueva sección "Banner del homepage" en `/admin/configuracion`
- Inputs: imagen desktop, imagen mobile, link destino, texto alt
- Toggle para activar/desactivar el banner
- Componente `HomeBanner` que renderiza el banner responsive
- Fallback: si no hay banner activo, se muestra el `HomeCarousel` actual
- Detección de dispositivo: CSS media query (mobile < 768px)

### Out of Scope
- Subida de imágenes (solo URLs externas)
- Múltiples banners / carousel de banners
- Banner en otras páginas
- Animaciones o transiciones fancy

## Capabilities

### New Capabilities
- `home-banner`: Capacidad de configurar el banner principal del homepage desde el admin con imagen desktop/mobile y link

## Approach

**Storage**: Usar tabla `settings` existente con keys individuales:
- `home_banner_desktop` — URL de imagen desktop
- `home_banner_mobile` — URL de imagen mobile
- `home_banner_link` — URL de destino (opcional, puede ser vacío)
- `home_banner_alt` — texto alternativo
- `home_banner_active` — `true`/`false`

**Admin UI**: Nueva sub-sección dentro de `/admin/configuracion` con:
- Toggle激活/desactivar banner
- Input text para URL de imagen desktop
- Input text para URL de imagen mobile (opcional, si está vacío se usa desktop en mobile)
- Input text para link de destino
- Input text para alt text
- Preview del banner (opcional, si ambas URLs están填)

**Server Action**: `getHomeBanner()` y `saveHomeBanner()` en `actions.ts`

**Frontend**:
- `HomeBanner` client component que lee banner config
- Si `home_banner_active = true` y las URLs están填, renderiza banner responsive
- Sino, renderiza `HomeCarousel` (comportamiento actual)
- CSS: `.home-banner` con `aspect-ratio` o altura fija, `object-fit: cover`
- Mobile: media query `< 768px` muestra la imagen mobile

**Desactivar banner**: El admin setea `home_banner_active = false` → se muestra el carousel como hasta ahora.

## Affected Areas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `src/app/admin/configuracion/actions.ts` | Modificado | Agregar `getHomeBanner()`, `saveHomeBanner()` |
| `src/app/admin/configuracion/page.tsx` | Modificado | Agregar sección de configuración del banner |
| `src/components/HomeBanner.tsx` | Nuevo | Componente client que renderiza el banner responsive |
| `src/app/page.tsx` | Modificado | Importar `HomeBanner`, condicional con `HomeCarousel` |
| `src/app/globals.css` | Modificado | Estilos de `.home-banner` |

## Risks

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| URLs inválidas rompen el banner | Media | `next/image` con `onError` fallback a texto o nada |
| Banner muy grande afecta performance | Baja | Usar `next/image` con sizes apropiados |
| Imágenes de dimensões muy distintas entre desktop/mobile | Baja | Admins deben subir en proporción correcta (16:9 o similar) |

## Rollback Plan

1. En admin, setear `home_banner_active = false`
2. Se vuelve a mostrar `HomeCarousel` original inmediatamente
3. No hay cambios en DB schema — solo cambios en valores de `settings`

## Dependencies

- `next/image` para optimización de imágenes (ya usado en el proyecto)
- `settings` table existente (ya existe)

## Success Criteria

- [ ] Admin puede activar/desactivar banner y guardar URLs
- [ ] Homepage muestra banner con imagen desktop en pantalla grande
- [ ] Homepage muestra banner con imagen mobile en < 768px
- [ ] Banner es clickeable si tiene link configurado
- [ ] Si `home_banner_active = false`, se muestra `HomeCarousel` actual
- [ ] Build pasa sin errores
- [ ] Persistencia verificada en DB
