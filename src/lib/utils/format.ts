/**
 * Format price in Argentine pesos.
 * Todos los precios se almacenan en CENTAVOS en la DB (integer).
 * Esta función los convierte a pesos dividiendo por 100.
 *
 * @example
 *   formatPrice(25000) // "$250"  (25000 cents = $250 ARS)
 *   formatPrice(19999) // "$199.99"
 */

export function formatPrice(amount: number | null | undefined): string {
  if (amount == null) return '—';
  const pesos = amount / 100;
  return `$${pesos.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
