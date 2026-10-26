'use client';

import { useEffect, useState } from 'react';
import type { InventoryStatusFilter } from './types';

interface ToolbarProps {
  searchQuery: string;
  statusFilter: InventoryStatusFilter;
  hasFilters: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: InventoryStatusFilter) => void;
  onClearFilters: () => void;
}

export default function Toolbar({
  searchQuery,
  statusFilter,
  hasFilters,
  onSearchChange,
  onStatusChange,
  onClearFilters,
}: ToolbarProps) {
  const [draftSearch, setDraftSearch] = useState(searchQuery);

  useEffect(() => {
    setDraftSearch(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (draftSearch !== searchQuery) {
        onSearchChange(draftSearch);
      }
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [draftSearch, onSearchChange, searchQuery]);

  return (
    <div className="admin-inventory-toolbar">
      <div className="admin-inventory-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="search"
          value={draftSearch}
          onChange={(event) => setDraftSearch(event.target.value)}
          placeholder="Buscar producto"
          className="admin-inventory-search-input"
        />
        {draftSearch && (
          <button
            type="button"
            className="admin-inventory-search-clear"
            onClick={() => setDraftSearch('')}
            aria-label="Limpiar búsqueda"
          >
            ×
          </button>
        )}
      </div>

      <select
        className="admin-select admin-inventory-status"
        value={statusFilter}
        onChange={(event) => onStatusChange(event.target.value as InventoryStatusFilter)}
      >
        <option value="todos">Todos</option>
        <option value="bajo">Con stock bajo</option>
        <option value="sin">Sin stock</option>
      </select>

      <button
        type="button"
        className="admin-btn admin-btn-secondary admin-btn-sm"
        onClick={onClearFilters}
        disabled={!hasFilters}
      >
        Limpiar filtros
      </button>
    </div>
  );
}
