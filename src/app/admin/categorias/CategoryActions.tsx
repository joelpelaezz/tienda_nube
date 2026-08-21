'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createCategory, updateCategory, deleteCategory } from './actions';

interface Category {
  id: number;
  name: string;
  slug: string;
  parentId: number | null;
}

interface CategoryActionsProps {
  mode: 'create' | 'edit' | 'delete' | 'menu';
  category?: Category;
  categories?: Category[];
  productCount?: number;
  triggerId?: string;
}

export function CategoryActions({ mode, category, categories = [], productCount, triggerId }: CategoryActionsProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === 'menu' && open && menuRef.current) {
      const handleClickOutside = (e: MouseEvent) => {
        if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
          setOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, mode]);

  useEffect(() => {
    if (mode !== 'menu' && open && dialogRef.current) {
      dialogRef.current.showModal();
    } else if (mode !== 'menu' && !open && dialogRef.current) {
      dialogRef.current.close();
    }
  }, [open, mode]);

  // Listen for trigger button click (from parent menu)
  useEffect(() => {
    if (triggerId) {
      const btn = document.getElementById(triggerId);
      if (btn) {
        const handler = () => setOpen(true);
        btn.addEventListener('click', handler);
        return () => btn.removeEventListener('click', handler);
      }
    }
  }, [triggerId]);

  const handleClose = () => {
    setOpen(false);
    setError('');
  };

  const handleCreate = async (formData: FormData) => {
    setLoading(true);
    setError('');
    try {
      const result = await createCategory(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        handleClose();
        router.refresh();
      }
    } catch (e) {
      setError('Error al crear la categor\u00eda');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (formData: FormData) => {
    if (!category) return;
    setLoading(true);
    setError('');
    try {
      const result = await updateCategory(category.id, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        handleClose();
        router.refresh();
      }
    } catch (e) {
      setError('Error al actualizar la categor\u00eda');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!category) return;
    setLoading(true);
    setError('');
    try {
      const result = await deleteCategory(category.id);
      if (result?.error) {
        setError(result.error);
      } else {
        handleClose();
        router.refresh();
      }
    } catch (e) {
      setError('Error al eliminar la categor\u00eda');
    } finally {
      setLoading(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const ErrorAlert = ({ text }: { text: string }) => (
    <div className="admin-alert-error">{text}</div>
  );

  // ─── Create ───
  if (mode === 'create') {
    return (
      <>
        <button className="admin-btn admin-btn-primary" onClick={() => setOpen(true)}>
          Crear categor\u00eda
        </button>

        <dialog ref={dialogRef} onClose={handleClose} className="admin-dialog">
          <form onSubmit={(e) => { e.preventDefault(); handleCreate(new FormData(e.currentTarget)); }}>
            <div className="admin-dialog-body">
              <h3 className="admin-dialog-title">Nueva categor\u00eda</h3>

              <div className="admin-form-group">
                <label className="admin-form-label">Nombre</label>
                <input type="text" name="name" className="admin-input" required placeholder="Ej: Mundo Capibara"
                  onChange={(e) => {
                    const slugInput = e.currentTarget.form?.querySelector('[name="slug"]') as HTMLInputElement;
                    if (slugInput) slugInput.value = generateSlug(e.target.value);
                  }}
                />
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Slug</label>
                <input type="text" name="slug" className="admin-input" required placeholder="mundo-capibara" />
                <div className="admin-form-hint">Identificador URL. Se genera autom\u00e1ticamente del nombre.</div>
              </div>

              <div className="admin-form-group">
                <label className="admin-form-label">Categor\u00eda padre (opcional)</label>
                <select name="parentId" className="admin-select admin-select-full">
                  <option value="">Ninguna (categor\u00eda principal)</option>
                  {categories.filter(c => !c.parentId).map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <div className="admin-form-hint">Dej\u00e1 vac\u00edo para crear una categor\u00eda principal.</div>
              </div>

              {error && <ErrorAlert text={error} />}

              <div className="admin-dialog-footer">
                <button type="button" className="admin-btn admin-btn-secondary" onClick={handleClose}>Cancelar</button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear categor\u00eda'}
                </button>
              </div>
            </div>
          </form>
        </dialog>
      </>
    );
  }

  // ─── 3-Dot Menu ───
  if (mode === 'menu' && category) {
    return (
      <div ref={menuRef} className="admin-dropdown">
        <button onClick={() => setOpen(!open)} className="admin-cat-action-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>

        {open && (
          <div className="admin-dropdown-menu">
            <button className="admin-dropdown-item" onClick={() => { setOpen(false); document.getElementById(`edit-dialog-${category.id}`)?.click(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Editar
            </button>
            <button className="admin-dropdown-item admin-dropdown-item-danger" onClick={() => { setOpen(false); document.getElementById(`delete-dialog-${category.id}`)?.click(); }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              Eliminar
            </button>
          </div>
        )}

        <button id={`edit-dialog-${category.id}`} onClick={() => setOpen(true)} style={{ display: 'none' }} />
        <button id={`delete-dialog-${category.id}`} onClick={() => setOpen(true)} style={{ display: 'none' }} />

        <CategoryActions mode="edit" category={category} categories={categories} triggerId={`edit-dialog-${category.id}`} />
        <CategoryActions mode="delete" category={category} productCount={productCount} triggerId={`delete-dialog-${category.id}`} />
      </div>
    );
  }

  // ─── Edit ───
  if (mode === 'edit' && category) {
    return (
      <dialog ref={dialogRef} onClose={handleClose} className="admin-dialog">
        <form onSubmit={(e) => { e.preventDefault(); handleUpdate(new FormData(e.currentTarget)); }}>
          <div className="admin-dialog-body">
            <h3 className="admin-dialog-title">Editar categor\u00eda</h3>

            <div className="admin-form-group">
              <label className="admin-form-label">Nombre</label>
              <input type="text" name="name" className="admin-input" required defaultValue={category.name} />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Slug</label>
              <input type="text" name="slug" className="admin-input" required defaultValue={category.slug} />
            </div>

            <div className="admin-form-group">
              <label className="admin-form-label">Categor\u00eda padre</label>
              <select name="parentId" className="admin-select admin-select-full" defaultValue={category.parentId ?? ''}>
                <option value="">Ninguna (categor\u00eda principal)</option>
                {categories.filter(c => !c.parentId && c.id !== category.id).map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {error && <ErrorAlert text={error} />}

            <div className="admin-dialog-footer">
              <button type="button" className="admin-btn admin-btn-secondary" onClick={handleClose}>Cancelar</button>
              <button type="submit" className="admin-btn admin-btn-primary" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </form>
      </dialog>
    );
  }

  // ─── Delete ───
  if (mode === 'delete' && category) {
    return (
      <dialog ref={dialogRef} onClose={handleClose} className="admin-dialog">
        <div className="admin-dialog-body">
          <h3 className="admin-dialog-title">Eliminar categor\u00eda</h3>
          <p className="admin-dialog-text">
            \u00bfEst\u00e1s seguro de que quer\u00e9s eliminar <strong>{category.name}</strong>?
            {productCount !== undefined && productCount > 0 && (
              <span className="admin-dialog-warning">
                Esta categor\u00eda tiene {productCount} producto{productCount !== 1 ? 's' : ''}. Los productos quedar\u00e1n sin categor\u00eda.
              </span>
            )}
          </p>

          {error && <ErrorAlert text={error} />}

          <div className="admin-dialog-footer">
            <button className="admin-btn admin-btn-secondary" onClick={handleClose}>Cancelar</button>
            <button className="admin-btn admin-btn-danger" onClick={handleDelete} disabled={loading}>
              {loading ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </dialog>
    );
  }

  return null;
}
