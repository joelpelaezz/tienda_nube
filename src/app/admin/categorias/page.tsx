import { db } from '@/lib/db';
import { categories, products } from '@/drizzle/schema';
import { eq, asc, sql } from 'drizzle-orm';
import { CategoryActions } from './CategoryActions';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage() {
  const [cats, counts] = await Promise.all([
    db.select().from(categories).orderBy(asc(categories.id)),
    db.select({
      categoryId: categories.id,
      count: sql<number>`count(${products.id})::int`,
    })
      .from(categories)
      .leftJoin(products, eq(products.categoryId, categories.id))
      .groupBy(categories.id),
  ]);

  const countMap = new Map(counts.map(c => [c.categoryId, c.count]));
  const parentCats = cats.filter(c => !c.parentId);
  const childCats = cats.filter(c => c.parentId);

  return (
    <div>
      {/* Page header */}
      <div className="admin-cat-header">
        <div className="admin-cat-header-text">
          <h1>Categor\u00edas</h1>
          <p>Para organizar tus productos, cre\u00e1 categor\u00edas y subcategor\u00edas que aparecer\u00e1n en el men\u00fa de la tienda.</p>
        </div>
        <div className="admin-cat-actions">
          <CategoryActions mode="create" categories={cats} />
        </div>
      </div>

      {/* Categories list */}
      <div className="admin-table-container">
        {cats.length === 0 ? (
          <div className="admin-empty-state">
            <div className="admin-empty-state-title">No hay categor\u00edas</div>
            <div className="admin-empty-state-text">Cre\u00e1 una categor\u00eda para organizar tus productos.</div>
            <div style={{ marginTop: 'var(--nimbus-space-4)' }}>
              <CategoryActions mode="create" categories={cats} />
            </div>
          </div>
        ) : (
          <div>
            {parentCats.map((cat) => {
              const children = childCats.filter(c => c.parentId === cat.id);
              const hasChildren = children.length > 0;

              return (
                <div key={cat.id}>
                  {/* Parent category row */}
                  <div className="admin-cat-list-item">
                    <div className="admin-cat-drag-handle">
                      <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
                        <circle cx="3" cy="2" r="1.2" /><circle cx="9" cy="2" r="1.2" />
                        <circle cx="3" cy="6" r="1.2" /><circle cx="9" cy="6" r="1.2" />
                        <circle cx="3" cy="10" r="1.2" /><circle cx="9" cy="10" r="1.2" />
                        <circle cx="3" cy="14" r="1.2" /><circle cx="9" cy="14" r="1.2" />
                      </svg>
                    </div>

                    {hasChildren ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="admin-cat-expand-icon">
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    ) : (
                      <div className="admin-cat-spacer" />
                    )}

                    <div className="admin-cat-info">
                        <span className="admin-cat-name admin-interactive">
                        {cat.name}
                      </span>
                    </div>

                    <div className="admin-cat-actions">
                      <button className="admin-cat-action-btn" title="Duplicar">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </button>
                      <CategoryActions mode="menu" category={cat} productCount={countMap.get(cat.id) || 0} categories={cats} />
                    </div>
                  </div>

                  {/* Child categories */}
                  {children.map((child) => (
                    <div key={child.id} className="admin-cat-child">
                      <div className="admin-cat-drag-handle">
                        <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor">
                          <circle cx="3" cy="2" r="1.2" /><circle cx="9" cy="2" r="1.2" />
                          <circle cx="3" cy="6" r="1.2" /><circle cx="9" cy="6" r="1.2" />
                          <circle cx="3" cy="10" r="1.2" /><circle cx="9" cy="10" r="1.2" />
                          <circle cx="3" cy="14" r="1.2" /><circle cx="9" cy="14" r="1.2" />
                        </svg>
                      </div>

                      <div className="admin-cat-spacer" />

                      <div className="admin-cat-info">
<span className="admin-cat-name admin-interactive">
                          {child.name}
                        </span>
                      </div>

                      <div className="admin-cat-actions">
                        <button className="admin-cat-action-btn" title="Duplicar">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>
                        <CategoryActions mode="menu" category={child} productCount={countMap.get(child.id) || 0} categories={cats} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer link */}
      <div className="admin-help-link">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <a href="#">M\u00e1s sobre crear y organizar categor\u00edas</a>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
        </svg>
      </div>
    </div>
  );
}
