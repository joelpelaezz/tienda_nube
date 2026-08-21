# Tienda Nube Clone

Clone de la tienda Tendencia Shop (tendenciashop.com.ar) desarrollado con Next.js, TypeScript, Tailwind CSS, Drizzle ORM y PostgreSQL.

## 🚀 Stack

- **Frontend**: Next.js 14+ (App Router), React 18+, TypeScript 5+
- **Styling**: Tailwind CSS 3+ con tokens de Montserrat
- **Backend**: Vercel Postgres (PostgreSQL 16)
- **ORM**: Drizzle ORM
- **State**: Zustand (carrito)
- **Database**: Docker PostgreSQL 16

## 📋 Prerrequisitos

- Node.js 18+ (recomendado: v24.15.0)
- npm 9+ (recomendado: 11.12.1)
- Docker y Docker Compose (para PostgreSQL local)

## 🐳 Paso 1: Levantar PostgreSQL

```bash
# Iniciar contenedor de PostgreSQL
docker compose up -d

# Verificar que está corriendo
docker compose ps
```

La base de datos estará disponible en:
- **Host**: `localhost:5434`
- **User**: `postgres`
- **Password**: `postgres`
- **Database**: `tienda_nube`

## 📦 Paso 2: Instalar dependencias

```bash
npm install
```

## 🗄️ Paso 3: Configurar base de datos

```bash
# Generar migraciones de Drizzle
npm run db:generate

# Aplicar schema a la base de datos
npm run db:push

# Cargar productos de ejemplo (20 productos reales)
npm run db:seed
```

## 🏃 Paso 4: Ejecutar en desarrollo

```bash
npm run dev
```

La aplicación estará disponible en: **http://localhost:3090**

## 📁 Estructura del proyecto

```
tienda_nube/
├── docker-compose.yml          ← PostgreSQL local
├── .env.local                  ← Variables de entorno
├── package.json                ← Dependencias
├── tailwind.config.ts          ← Tokens de Montserrat
├── drizzle/
│   ├── schema.ts               ← Database schema
│   ├── seed.ts                 ← 20 productos reales
│   └── migrations/             ← Migraciones generadas
└── src/
    ├── app/
    │   ├── layout.tsx          ← Layout raíz
    │   ├── page.tsx            ← Home
    │   ├── globals.css         ← Estilos globales
    │   ├── not-found.tsx       ← 404
    │   ├── productos/
    │   │   ├── page.tsx        ← Catálogo
    │   │   └── [slug]/
    │   │       └── page.tsx    ← Producto individual
    │   └── contacto/
    │       └── page.tsx        ← Contacto
    ├── components/
    │   ├── Header.tsx          ← Header con nav
    │   ├── Footer.tsx          ← Footer
    │   ├── ProductCard.tsx     ← Card de producto
    │   ├── CartDrawer.tsx      ← Modal carrito
    │   └── AddToCartButton.tsx ← Botón agregar
    └── lib/
        ├── db.ts               ← Conexión Drizzle
        └── store.ts            ← Zustand (carrito)
```

## 🎨 Datos reales

Los productos y imágenes son reales, extraídos de tendenciashop.com.ar:

- **20 productos** con nombres, precios e imágenes reales
- **2 categorías**: Mundo Capibara, Vuelta a Clase
- **7 subcategorías**: Peluches, Almohada, Llaveros, Escolar, Mochila, Termos, Accesorio
- **4 variantes**: Rosa/Azul, Celeste/Marrón/Amarillo, Beige/Marrón
- **Imágenes**: URLs directas de mitiendanube.com (CDN)

## 🛒 Funcionalidades

### Home
- Hero slider
- Sección de servicios (envío, pago, seguridad)
- Productos destacados (grid)
- Productos en oferta (slider)
- Newsletter
- Redes sociales

### Catálogo
- Grid de productos (4 columnas desktop)
- Sidebar con filtros (categorías, precio)
- Ordenamiento (precio, nombre, fecha)
- Paginación

### Producto
- Galería de imágenes con thumbnails
- Selector de variantes
- Precio con descuento
- Precio de transferencia
- Calculador de envío
- Trust badges
- Compartir (WhatsApp, Facebook, Twitter)
- Productos similares

### Carrito
- Modal drawer lateral
- Agregar/eliminar productos
- Modificar cantidad
- Subtotal y precio con transferencia
- Botón de checkout

## 🚀 Deploy a Vercel

```bash
# 1. Crear repo en GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin <tu-repo>
git push -u origin main

# 2. Conectar a Vercel
# - Ir a vercel.com
# - Importar proyecto desde GitHub
# - Configurar variables de entorno:
#   POSTGRES_URL=<tu-url-de-vercel-postgres>

# 3. Deploy automático
# Cada push a main hará deploy automáticamente
```

## 📝 Comandos útiles

```bash
# Desarrollo
npm run dev              # Iniciar en http://localhost:3090

# Base de datos
npm run db:generate      # Generar migraciones
npm run db:push          # Aplicar schema
npm run db:seed          # Cargar productos de ejemplo
npm run db:studio        # Abrir Drizzle Studio (UI)

# Build
npm run build            # Build de producción
npm run start            # Iniciar en producción

# Lint
npm run lint             # Verificar código
```

## 🔧 Variables de entorno

```bash
# .env.local
POSTGRES_URL=postgresql://postgres:postgres@localhost:5434/tienda_nube
NEXT_PUBLIC_SITE_URL=http://localhost:3090
```

## 📚 Documentación adicional

- [Next.js Docs](https://nextjs.org/docs)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Drizzle ORM Docs](https://orm.drizzle.team/docs)
- [Zustand Docs](https://github.com/pmndrs/zustand)

## 🤔 Problemas comunes

### PostgreSQL no inicia
```bash
# Verificar logs
docker compose logs db

# Reiniciar
docker compose down
docker compose up -d
```

### Puerto 5434 en uso
```bash
# Cambiar puerto en docker-compose.yml
ports:
  - "5435:5432"  # Usar 5435 en vez de 5434
```

### Error de conexión a BD
```bash
# Verificar que PostgreSQL está corriendo
docker compose ps

# Verificar credenciales en .env.local
cat .env.local
```

## 📄 Licencia

Este proyecto es solo para fines educativos.
