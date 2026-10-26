import { db } from '@/lib/db';
import { categories, products, productCategories } from '@/drizzle/schema';
import { eq, asc, sql, and } from 'drizzle-orm';
import { CategoryActions } from './CategoryActions';
import CategoriesTree from './CategoriesTree';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const [cats, counts] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.position), asc(categories.id)),
    db.select({ categoryId: categories.id, count: sql<number>`count(${products.id})::int` })
      .from(categories)
      .leftJoin(productCategories, eq(productCategories.categoryId, categories.id))
      .leftJoin(products, and(eq(products.id, productCategories.productId), eq(products.isVisible, true)))
      .groupBy(categories.id),
  ]);

  const countMap = Object.fromEntries(counts.map((category) => [category.categoryId, category.count]));

  return (
    <div>
      <div className="admin-cat-header">
        <div className="admin-cat-header-text">
          <h1>Categorías</h1>
          <p>Arrastrá una categoría sobre otra para convertirla en hija. Soltala en el nivel raíz para volverla principal.</p>
        </div>
        <div className="admin-cat-actions"><CategoryActions mode="create" categories={cats} /></div>
      </div>

       <div className="admin-table-container admin-categories-responsive">
        {cats.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-state-title">No hay categorías</div>
            <div className="admin-empty-state-text">Creá una categoría para organizar tus productos.</div>
            <div style={{ marginTop: 'var(--nimbus-space-4)' }}><CategoryActions mode="create" categories={cats} /></div>
          </div>
        ) : (
          <CategoriesTree categories={cats} countMap={countMap} />
        )}
      </div>

      <div className="admin-help-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span style={{ color: 'var(--color-text-muted)', cursor: 'default' }}>Más sobre crear y organizar categorías</span>
      </div>
    </div>
  );
}
