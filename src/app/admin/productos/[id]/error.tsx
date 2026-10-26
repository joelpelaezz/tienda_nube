'use client';

export default function ProductEditError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="container py-8">
      <div className="admin-error-box" role="alert">
        <h1>No pudimos guardar el producto</h1>
        <p>Revisá los datos ingresados e intentá nuevamente.</p>
        <button type="button" className="admin-btn admin-btn-primary" onClick={() => reset()}>
          Intentar nuevamente
        </button>
      </div>
    </main>
  );
}
