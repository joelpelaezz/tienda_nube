// Centralized color map for variant display
// Used by VariantSelector, ProductCard, QuickShopModal

export const VARIANT_COLORS: Record<string, string> = {
  rosa: '#F8BBD0',
  azul: '#42A5F5',
  celeste: '#81D4FA',
  marron: '#8D6E63',
  marrón: '#8D6E63',
  beige: '#D7CCC8',
  amarillo: '#FDD835',
  rojo: '#EF5350',
  verde: '#66BB6A',
  negro: '#212121',
  blanco: '#FAFAFA',
  gris: '#9E9E9E',
  naranja: '#FF7043',
  morado: '#AB47BC',
  turquesa: '#26C6DA',
  tortuga: '#6D4C41',
  conejo: '#F48FB1',
  béisbol: '#5D4037',
  hamburguesa: '#FF8F00',
  egresado: '#1565C0',
  unicornio: '#CE93D8',
  palta: '#8BC34A',
  cocinero: '#FAFAFA',
  cumpleaños: '#FF7043',
  'cumpleañero': '#FF7043',
  'con mochila hamburguesa': '#FF8F00',
};

export function getVariantColor(name: string): string {
  return VARIANT_COLORS[name.toLowerCase()] || '#9E9E9E';
}
