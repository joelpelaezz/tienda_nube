'use client';

import { FormEvent, useState } from 'react';
import { formatPrice } from '@/lib/utils/format';
import PostalCodeHelpButton from './PostalCodeHelpButton';

type Quote = {
  methodCode: string;
  methodName: string;
  cost: number;
  estimatedDays: string | null;
};

export default function ShippingCalculator({ subtotal }: { subtotal: number }) {
  const [postalCode, setPostalCode] = useState('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setQuotes([]);
    try {
      const response = await fetch('/api/shipping/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postalCode, subtotal }),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || 'No pudimos calcular el envío.');
        return;
      }
      if (result.quotes.length === 0) {
        setError('No hay medios de envío disponibles para este código postal.');
        return;
      }
      setQuotes(result.quotes);
    } catch {
      setError('No pudimos calcular el envío. Intentá nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="detalle-shipping">
      <div className="detalle-shipping-header"><span>🚚</span><span>Medios de envío</span></div>
      <form className="detalle-shipping-form" onSubmit={handleSubmit}>
        <input
          type="text"
          value={postalCode}
          onChange={(event) => setPostalCode(event.target.value)}
          placeholder="Tu código postal"
          className="detalle-shipping-input"
          aria-label="Código postal"
          required
        />
        <button className="detalle-shipping-btn" disabled={loading}>
          {loading ? 'CALCULANDO...' : 'CALCULAR'}
        </button>
      </form>
      {error && <p className="newsletter-form-error">{error}</p>}
      {quotes.length > 0 && (
        <div className="shipping-quote-list">
          {quotes.map((quote) => (
            <div className="shipping-quote" key={quote.methodCode}>
              <strong>{quote.methodName}</strong>
              <span>{quote.cost === 0 ? 'Gratis' : formatPrice(quote.cost)}</span>
              {quote.estimatedDays && <small>{quote.estimatedDays}</small>}
            </div>
          ))}
        </div>
      )}
      <PostalCodeHelpButton />
    </div>
  );
}
