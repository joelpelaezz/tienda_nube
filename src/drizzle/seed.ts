import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { categories, products, productVariants, productImages, productCategories } from './schema';

const connectionString = process.env.POSTGRES_URL || 'postgresql://postgres:postgres@localhost:5434/tienda_nube';

const client = postgres(connectionString);
const db = drizzle(client);

async function seed() {
  console.log('🌱 Seeding database...');

  // Limpiar tablas en orden correcto (respetando foreign keys)
  await db.delete(productCategories);
  await db.delete(productVariants);
  await db.delete(productImages);
  await db.delete(products);
  await db.delete(categories);

  // ──────────────────────────────────────────────────────
  // Categories
  // ──────────────────────────────────────────────────────
  const insertedCategories = await db.insert(categories).values([
    { name: 'Mundo Capibara', slug: 'mundo-capibara' },
    { name: 'Vuelta a Clase', slug: 'vuelta-a-clase' },
    { name: 'Peluches', slug: 'peluches' },
    { name: 'Almohada', slug: 'almohada' },
    { name: 'Llaveros', slug: 'llaveros' },
    { name: 'Escolar', slug: 'escolar' },
    { name: 'Mochila', slug: 'mochila' },
    { name: 'Termos', slug: 'termos' },
    { name: 'Accesorio', slug: 'accesorio' },
  ]).returning();

  console.log('✅ Categories inserted:', insertedCategories.length);

  // Mapear IDs
  const mundoCapibara = insertedCategories.find(c => c.slug === 'mundo-capibara')!;
  const vueltaClase = insertedCategories.find(c => c.slug === 'vuelta-a-clase')!;
  const peluches = insertedCategories.find(c => c.slug === 'peluches')!;
  const llaveros = insertedCategories.find(c => c.slug === 'llaveros')!;
  const escolar = insertedCategories.find(c => c.slug === 'escolar')!;
  const mochila = insertedCategories.find(c => c.slug === 'mochila')!;
  const accesorio = insertedCategories.find(c => c.slug === 'accesorio')!;

  // ──────────────────────────────────────────────────────
  // Products (20 productos reales)
  // ──────────────────────────────────────────────────────
  const productSeedData = [
    {
      name: 'Taza de Café automática',
      slug: 'taza-de-cafe-automatica',
      price: 25000,
      priceTransfer: 22500,
      badge: 'Envío gratis',
      categoryId: vueltaClase.id,
    },
    {
      name: 'Cobertor GoldSun 7 piezas',
      slug: 'cobertor-goldsun-7-piezas',
      price: 130000,
      priceOffer: 120000,
      priceTransfer: 108000,
      discount: '8%',
      categoryId: mundoCapibara.id,
    },
    {
      name: 'Peluche Stitch con manta',
      slug: 'peluche-stitch-con-manta',
      price: 50000,
      priceOffer: 45000,
      priceTransfer: 40500,
      discount: '10%',
      description: 'Peluche Stitch de 45 cm de alto con una manta suave de 1.5 m x 1 m. Ideal para momentos de relax, su diseño encantador y su textura agradable hacen que sea el compañero perfecto para grandes y chicos.',
      categoryId: peluches.id,
    },
    {
      name: 'Peluches Bubus con manta',
      slug: 'peluches-bubus-con-manta',
      price: 55000,
      priceOffer: 50000,
      priceTransfer: 45000,
      discount: '9%',
      categoryId: peluches.id,
    },
    {
      name: 'Mochila Stich',
      slug: 'mochila-stich',
      price: null,
      categoryId: mochila.id,
    },
    {
      name: 'Mochila Melody Rosa Jardín',
      slug: 'mochila-melody-rosa-jardin',
      price: null,
      categoryId: mochila.id,
    },
    {
      name: 'Peluche con Manta Mono',
      slug: 'peluche-con-manta-mono',
      price: 60000,
      priceOffer: 45000,
      priceTransfer: 40500,
      discount: '25%',
      categoryId: peluches.id,
    },
    {
      name: 'Peluche con Manta Cinnamonroll',
      slug: 'peluche-con-manta-cinnamonroll',
      price: 60000,
      priceOffer: 45000,
      priceTransfer: 40500,
      discount: '25%',
      categoryId: peluches.id,
    },
    {
      name: 'Peluche con Manta Kuromi',
      slug: 'peluche-con-manta-kuromi',
      price: 60000,
      priceOffer: 45000,
      priceTransfer: 40500,
      discount: '25%',
      categoryId: peluches.id,
    },
    {
      name: 'Peluche con Manta Melody Tiburón',
      slug: 'peluche-con-manta-melody-tiburon',
      price: 60000,
      priceOffer: 45000,
      priceTransfer: 40500,
      discount: '25%',
      categoryId: peluches.id,
    },
    {
      name: 'Vincha Capibara',
      slug: 'vincha-capibara',
      price: 15000,
      priceOffer: 10000,
      priceTransfer: 9000,
      discount: '33%',
      categoryId: accesorio.id,
    },
    {
      name: 'Capibara Caminante con sonido',
      slug: 'capibara-caminante-con-sonido',
      price: 22000,
      priceOffer: 20000,
      priceTransfer: 18000,
      discount: '9%',
      categoryId: peluches.id,
    },
    {
      name: 'Broche Capibara',
      slug: 'broche-capibara',
      price: 3000,
      priceTransfer: 2700,
      categoryId: accesorio.id,
    },
    {
      name: 'Set Utensilios de silicona x 12 u',
      slug: 'set-utensilios-silicona-x12',
      price: null,
      categoryId: vueltaClase.id,
    },
    {
      name: 'Mochila Capibara Jardín',
      slug: 'mochila-capibara-jardin',
      price: null,
      categoryId: mochila.id,
    },
    {
      name: 'Set de Utensilios de Silicona x 18 piezas',
      slug: 'set-utensilios-silicona-x18',
      price: null,
      categoryId: vueltaClase.id,
    },
    {
      name: 'Set de Cubiertos x 48 u acero inoxidable',
      slug: 'set-cubiertos-48u-acero',
      price: null,
      categoryId: vueltaClase.id,
    },
    {
      name: 'Llavero Capibara',
      slug: 'llavero-capibara',
      price: 10000,
      priceTransfer: 9000,
      categoryId: llaveros.id,
    },
    {
      name: 'Pulsera Capibara con cola giratoria',
      slug: 'pulsera-capibara-con-cola-giratoria',
      price: 20000,
      priceOffer: 15000,
      priceTransfer: 13500,
      discount: '25%',
      categoryId: accesorio.id,
    },
    {
      name: 'Marcadores Dual Tips x 72u',
      slug: 'marcadores-dual-tips-x72',
      price: 45000,
      priceOffer: 35000,
      priceTransfer: 31500,
      discount: '22%',
      categoryId: escolar.id,
    },
  ];
  const insertedProducts = await db.insert(products).values(
    productSeedData.map(({ categoryId: _categoryId, ...product }) => product)
  ).returning();

  console.log('✅ Products inserted:', insertedProducts.length);

  // ──────────────────────────────────────────────────────
  // Product Images
  // ──────────────────────────────────────────────────────
  const imagesData = [
    { slug: 'taza-de-cafe-automatica', images: ['https://dcdn-us.mitiendanube.com/stores/005/154/974/products/d0dec2-5027ab37e0026987eb17509671272072-1024-1024.webp'] },
    { slug: 'cobertor-goldsun-7-piezas', images: ['https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000162664-351767bf8b28b29b1817485577584042-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000162663-a0cbda43c4120c7dab17485577593397-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000162662-6fcf6bb1896eebad6717485577594228-1024-1024.webp'] },
    { slug: 'peluche-stitch-con-manta', images: ['https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000162654-bf0b5608a63599074917485559118159-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000162655-0487d5fad51e37f09c17485559118435-1024-1024.webp'] },
    { slug: 'peluches-bubus-con-manta', images: ['https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000160641-8f259d92c2110c207417481048100893-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000160645-96f54d194a45544d0817481065319642-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000160644-325d659c8948a2149717481065302135-1024-1024.webp'] },
    { slug: 'mochila-stich', images: ['https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000155630-a1062a05f09eec819817466806670245-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000155639-4c90209665b2f4074517466806785094-1024-1024.webp'] },
    { slug: 'mochila-melody-rosa-jardin', images: ['https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000154891-734c4d8b70d34dd39517465009938020-1024-1024.webp'] },
    { slug: 'peluche-con-manta-mono', images: ['https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000154868-a9257d92939a37fb6917464973637853-1024-1024.webp'] },
    { slug: 'peluche-con-manta-cinnamonroll', images: ['https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000154862-65af4b4ef9e35633ea17464967287647-1024-1024.webp'] },
    { slug: 'peluche-con-manta-kuromi', images: ['https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000132039-5eff461b9d4dbfc63f17411333166441-1024-1024.webp'] },
    { slug: 'peluche-con-manta-melody-tiburon', images: ['https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000132041-439da362cc2cb5ebfe17411332029427-1024-1024.webp'] },
    { slug: 'vincha-capibara', images: ['https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000131033-6adcc1b1a31235bd6117409363005289-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000131083-33b8b45d516b0b257b17409362985093-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000131093-8bafaee567b1dfea9617409362968655-1024-1024.webp'] },
    { slug: 'capibara-caminante-con-sonido', images: ['https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000131006-c1c8c9aa1279d2e86917409244659397-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000131007-9afbf9fd004b1eba2417409244662083-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000131009-9c5b99b2c4488f800a17409248934833-1024-1024.webp'] },
    { slug: 'broche-capibara', images: ['https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000131005-aeecfb1afadcfc7f9917409236793153-1024-1024.webp'] },
    { slug: 'set-utensilios-silicona-x12', images: ['https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000131001-ca83ed2c235b5502d017409224874685-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000131000-ae0bff47ac1b98782b17409224874340-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000131004-db3f5d30a40eeb819c17409229020706-1024-1024.webp'] },
    { slug: 'mochila-capibara-jardin', images: ['https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000130978-4cda2c9e891021bf5e17409180538899-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000130977-844d44370b24769de617409180538809-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000130976-d2d567595bd2a1175c17409180538982-1024-1024.webp'] },
    { slug: 'set-utensilios-silicona-x18', images: ['https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000130972-9dfd6436bdfbfceaba17409179519862-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000130974-02c18f1f6a43fa125317409179518884-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000130973-51d2f486cfc700b22717409179519010-1024-1024.webp'] },
    { slug: 'set-cubiertos-48u-acero', images: ['https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000130970-258ca516f8952440b217409178014221-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000130971-06c9f179197410321017409178014398-1024-1024.webp'] },
    { slug: 'llavero-capibara', images: ['https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000130760-6470519c0c2385666f17408796629820-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000130762-a4278b5c606972366617408803819596-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000130761-f68ccc6721560bd3f317408803815564-1024-1024.webp'] },
    { slug: 'pulsera-capibara-con-cola-giratoria', images: ['https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000130758-c50a194ba604e08fb617408787401812-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000130757-71026573bf2058580617408787405760-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000130754-5cfaf2f0d5c42b193017408787391381-1024-1024.webp'] },
    { slug: 'marcadores-dual-tips-x72', images: ['https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000127890-4917a2e7da8d68829c17403205180959-1024-1024.webp', 'https://dcdn-us.mitiendanube.com/stores/005/154/974/products/1000127879-1e0d5c1b8a46da2e4217403205129076-1024-1024.webp'] },
  ];

  for (const item of imagesData) {
    const product = insertedProducts.find(p => p.slug === item.slug);
    if (product) {
      for (let i = 0; i < item.images.length; i++) {
        await db.insert(productImages).values({
          productId: product.id,
          url: item.images[i],
          alt: product.name,
          position: i,
        });
      }
    }
  }

  console.log('✅ Product images inserted');

  // ──────────────────────────────────────────────────────
  // Product Variants
  // ──────────────────────────────────────────────────────
  const variantsData = [
    { slug: 'peluche-stitch-con-manta', variants: ['Rosa', 'Azul'] },
    { slug: 'peluches-bubus-con-manta', variants: ['Celeste', 'Marrón', 'Amarillo'] },
    { slug: 'capibara-caminante-con-sonido', variants: ['Rosa', 'Marrón', 'Beige'] },
    { slug: 'pulsera-capibara-con-cola-giratoria', variants: ['Beige', 'Marrón'] },
  ];

  for (const item of variantsData) {
    const product = insertedProducts.find(p => p.slug === item.slug);
    if (product) {
      for (const variantName of item.variants) {
        await db.insert(productVariants).values({
          productId: product.id,
          name: variantName,
          price: product.priceOffer || product.price,
          stock: 10,
        });
      }
    }
  }

  console.log('✅ Product variants inserted');

  // ──────────────────────────────────────────────────────
  // Product Categories
  // ──────────────────────────────────────────────────────
  await db.insert(productCategories).values(
    insertedProducts.map((product, index) => ({
      productId: product.id,
      categoryId: productSeedData[index].categoryId,
    }))
  );

  console.log('✅ Category products inserted');

  console.log('🎉 Seed completed!');
  process.exit(0);
}

seed().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
