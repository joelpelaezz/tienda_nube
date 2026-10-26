'use client';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  total: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, total, from, to, onPageChange }: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="admin-inventory-pagination">
      <span className="admin-pagination-info">
        Mostrando {from}-{to} de {total}
      </span>

      {totalPages > 1 && (
        <div className="admin-pagination-buttons">
          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm admin-pagination-btn"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            ←
          </button>

          {pages.map((page) => (
            <button
              key={page}
              type="button"
              className={`admin-btn admin-btn-sm admin-pagination-btn ${page === currentPage ? 'admin-btn-primary' : 'admin-btn-ghost'}`}
              onClick={() => onPageChange(page)}
              disabled={page === currentPage}
            >
              {page}
            </button>
          ))}

          <button
            type="button"
            className="admin-btn admin-btn-ghost admin-btn-sm admin-pagination-btn"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
