# SPEC: Home Banner Configurable

## Purpose

Permitir que el administrador configure el banner principal del homepage (imagen desktop + imagen mobile + link de destino) desde el panel de admin, sin necesidad de cambiar código.

---

## ADDED Requirements

### Requirement: Home Banner — Admin Configuration

El sistema DEBE permitir que un administrador configure los siguientes campos del banner del homepage:
- Imagen desktop (URL obligatoria)
- Imagen mobile (URL opcional; si está vacía se reutiliza la desktop)
- Link de destino (URL opcional)
- Texto alternativo (alt text)
- Estado activo (toggle on/off)

#### Scenario: Admin activa y configura el banner

- GIVEN el administrador está en `/admin/configuracion`
- WHEN ingresa URLs de desktop y mobile, un link, alt text, y activa el toggle
- AND hace click en "Guardar cambios"
- THEN los valores se persisten en la tabla `settings` y el banner aparece en el homepage

#### Scenario: Admin desactiva el banner

- GIVEN el administrador está en `/admin/configuracion`
- AND el banner está activo
- WHEN desactiva el toggle del banner
- AND hace click en "Guardar cambios"
- THEN `home_banner_active = false` y el homepage muestra el `HomeCarousel` original

#### Scenario: Admin deja URLs vacías en modo activo

- GIVEN el administrador activa el banner pero no ingresa URLs
- WHEN hace click en "Guardar cambios"
- THEN el banner no se muestra (fallback a `HomeCarousel`)

#### Scenario: Admin configura solo imagen desktop (sin mobile)

- GIVEN el administrador configura solo `home_banner_desktop`
- AND activa el banner
- THEN en mobile se usa la misma imagen desktop (comportamiento aceptable)

---

### Requirement: Home Banner — Renderizado en Homepage

El sistema DEBE renderizar el banner configurable en el homepage debajo del header, ocupando el ancho completo, antes del resto del contenido.

#### Scenario: Banner activo con ambas imágenes

- GIVEN `home_banner_active = true` y ambas URLs están configuradas
- WHEN un usuario visita el homepage desde desktop
- THEN se muestra la imagen desktop en resolución completa
- AND en mobile se muestra la imagen mobile

#### Scenario: Banner activo sin imagen mobile

- GIVEN `home_banner_active = true` y solo `home_banner_desktop` está configurada
- WHEN un usuario visita desde mobile
- THEN se muestra la imagen desktop redimensionada para mobile

#### Scenario: Banner con link configurado

- GIVEN `home_banner_active = true` y `home_banner_link` está configurado
- WHEN el usuario hace click en el banner
- THEN navega a la URL del link en la misma pestaña

#### Scenario: Banner sin link configurado

- GIVEN `home_banner_active = true` y `home_banner_link` está vacío
- THEN el banner no es clickeable y se muestra como imagen estática

#### Scenario: Banner inactivo

- GIVEN `home_banner_active = false` o no hay configuración
- THEN se renderiza el `HomeCarousel` con los slides hardcodeados (comportamiento actual)

#### Scenario: URL de imagen inválida o rota

- GIVEN la URL de la imagen del banner está rota o no carga
- THEN se muestra un placeholder vacío (sin error visible para el usuario)

---

## Technical Notes

### Storage
Valores en tabla `settings`:
- `home_banner_desktop` — string (URL)
- `home_banner_mobile` — string (URL, opcional)
- `home_banner_link` — string (URL, opcional)
- `home_banner_alt` — string (alt text)
- `home_banner_active` — string (`true`/`false`)

### Responsive
- Desktop: ≥ 768px → usa `home_banner_desktop`
- Mobile: < 768px → usa `home_banner_mobile` si está, si no `home_banner_desktop`

### Componentes
- `HomeBanner` client component → lee settings y renderiza banner
- `page.tsx` importa `HomeBanner` y lo muestra condicionalmente antes del `HomeCarousel`
- Si banner inactivo → solo `HomeCarousel`

### Admin
- Sección "Banner del homepage" dentro de `/admin/configuracion`
- Inputs: toggle, 2 URL inputs, link input, alt input, preview thumbnail
