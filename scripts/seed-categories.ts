import { db } from '@/lib/db';
import { categories } from '@/drizzle/schema';

async function main() {
  await db.insert(categories).values({ name: 'Remeras', slug: 'remeras' }).onConflictDoNothing();
  await db.insert(categories).values({ name: 'Pantalones', slug: 'pantalones' }).onConflictDoNothing();
  console.log('Categories seeded');
}

main().catch(console.error);
