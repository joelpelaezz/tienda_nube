export function translateMovementType(type: string) {
  const labels: Record<string, string> = {
    creacion: 'Creación',
    restock: 'Restock',
    venta: 'Venta',
    cancelacion: 'Cancelación',
    ajuste: 'Ajuste',
  };

  return labels[type] ?? type;
}

export function getStockLevel(stock: number) {
  if (stock <= 0) return 'out';
  if (stock <= 5) return 'low';
  return 'ok';
}
