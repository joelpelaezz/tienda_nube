import { db } from '@/lib/db';
import { categories } from '@/drizzle/schema';
import NewProductForm from './NewProductForm';

export const dynamic = 'force-dynamic';

export default async function NewProductPage() {
  const categoriesList = await db.select().from(categories).orderBy(categories.name);

  return <NewProductForm categories={categoriesList} />;
}
