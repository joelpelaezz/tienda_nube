/**
 * Format price in Argentine pesos.
 * Utility centralizada — reemplaza la función duplicada en 3+ archivos.
 *
 * @example
 *   formatPrice(25000) // "$25.000"
 *   formatPrice(19999) // "$19.999"
 */

export function formatPrice(amount: number): string {
  return `$${amount.toLocaleString('es-AR')},0`;
}
