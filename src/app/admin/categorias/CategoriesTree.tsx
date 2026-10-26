'use client';

import { useMemo, useState } from 'react';
import { moveCategory } from './actions';
import { CategoryActions } from './CategoryActions';

interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
  position: number;
}

export default function CategoriesTree({ categories, countMap }: { categories: Category[]; countMap: Record<number, number> }) {
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const childrenByParent = useMemo(() => {
    const map = new Map<number | null, Category[]>();
    for (const category of categories) map.set(category.parentId, [...(map.get(category.parentId) ?? []), category]);
    for (const siblings of Array.from(map.values())) {
      siblings.sort((a: Category, b: Category) => a.position - b.position || a.id - b.id);
    }
    return map;
  }, [categories]);

  const move = async (parentId: number | null) => {
    if (draggedId === null || draggedId === parentId) return;
    const result = await moveCategory(draggedId, parentId);
    if (result?.error) setError(result.error);
    else window.location.reload();
    setDraggedId(null);
  };

  const renderLevel = (parentId: number | null, depth = 0): React.ReactNode => (
    <div className={depth > 0 ? 'admin-cat-tree-children' : ''}>
      {(childrenByParent.get(parentId) ?? []).map((category) => (
        <div key={category.id}>
          <div
            className={`admin-cat-list-item ${draggedId === category.id ? 'admin-cat-list-item--dragging' : ''}`}
            draggable
            onDragStart={() => setDraggedId(category.id)}
            onDragEnd={() => setDraggedId(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => { event.preventDefault(); void move(category.id); }}
            style={{ paddingLeft: `${16 + depth * 28}px` }}
          >
            <div className="admin-cat-drag-handle" title="Arrastrar para convertir en hija">
              <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor" aria-hidden="true">
                <circle cx="3" cy="2" r="1.2" /><circle cx="9" cy="2" r="1.2" /><circle cx="3" cy="6" r="1.2" /><circle cx="9" cy="6" r="1.2" /><circle cx="3" cy="10" r="1.2" /><circle cx="9" cy="10" r="1.2" /><circle cx="3" cy="14" r="1.2" /><circle cx="9" cy="14" r="1.2" />
              </svg>
            </div>
            <span className="admin-cat-tree-depth">{depth === 0 ? 'Principal' : 'Hija'}</span>
            <div className="admin-cat-info"><span className="admin-cat-name">{category.name}</span></div>
            <div className="admin-cat-actions"><CategoryActions mode="menu" category={category} productCount={countMap[category.id] || 0} categories={categories} /></div>
          </div>
          {renderLevel(category.id, depth + 1)}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <div className={`admin-cat-root-drop ${draggedId !== null ? 'admin-cat-root-drop--active' : ''}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void move(null); }}>
        Soltá acá para mover a nivel raíz
      </div>
      {error && <div className="admin-error-box" style={{ margin: '12px 16px' }}>{error}</div>}
      {renderLevel(null)}
    </div>
  );
}
