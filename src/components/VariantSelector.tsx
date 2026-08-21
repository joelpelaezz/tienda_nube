'use client';

import { useState } from 'react';

interface Variant {
  id: number;
  name: string;
  price?: number | null;
}

interface VariantSelectorProps {
  variants: Variant[];
  selectedVariantId?: number;
  onSelect: (variant: Variant | null) => void;
}

// Map variant names to approximate hex colors
const COLOR_MAP: Record<string, string> = {
  'rosa': '#F8BBD0',
  'azul': '#42A5F5',
  'celeste': '#81D4FA',
  'marrón': '#8D6E63',
  'beige': '#D7CCC8',
  'amarillo': '#FDD835',
  'rojo': '#EF5350',
  'verde': '#66BB6A',
  'negro': '#212121',
  'blanco': '#FAFAFA',
  'gris': '#9E9E9E',
  'naranja': '#FF7043',
  'morado': '#AB47BC',
  'turquesa': '#26C6DA',
  'tortuga': '#6D4C41',
  'conejo': '#F48FB1',
  'béisbol': '#5D4037',
  'hamburguesa': '#FF8F00',
  'egresado': '#1565C0',
  'unicornio': '#CE93D8',
  'palta': '#8BC34A',
  'cocinero': '#FAFAFA',
  'cumpleañero': '#FF7043',
  'con mochila hamburguesa': '#FF8F00',
};

function getVariantColor(name: string): string {
  return COLOR_MAP[name.toLowerCase()] || '#9E9E9E';
}

export default function VariantSelector({
  variants,
  selectedVariantId,
  onSelect,
}: VariantSelectorProps) {
  const [selectedId, setSelectedId] = useState<number | null>(
    selectedVariantId || (variants.length > 0 ? variants[0].id : null)
  );

  const handleSelect = (variant: Variant) => {
    const newId = selectedId === variant.id ? null : variant.id;
    setSelectedId(newId);
    onSelect(newId === variant.id ? variant : null);
  };

  const selectedVariant = variants.find(v => v.id === selectedId);

  return (
    <div className="detalle-variants">
      <h3 className="detalle-variant-label">
        COLOR: <span className="font-normal">{selectedVariant?.name || 'Seleccionar'}</span>
      </h3>
      <div className="detalle-variant-options">
        {variants.map((variant) => (
          <button
            key={variant.id}
            className={`detalle-variant-btn ${selectedId === variant.id ? 'detalle-variant-btn-active' : ''}`}
            title={variant.name}
            style={{ backgroundColor: getVariantColor(variant.name) }}
            onClick={() => handleSelect(variant)}
            aria-label={variant.name}
          />
        ))}
      </div>
    </div>
  );
}
