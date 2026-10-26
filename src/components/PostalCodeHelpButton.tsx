'use client';

import { useState } from 'react';
import ProductModal from './ProductModal';

export default function PostalCodeHelpButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="detalle-shipping-help"
        onClick={() => setOpen(true)}
      >
        No sé mi código postal
      </button>

      <ProductModal
        isOpen={open}
        onClose={() => setOpen(false)}
        title="¿No sabés tu código postal?"
      >
        <div className="postal-code-help">
          <p>El código postal argentino (CPA) tiene el formato:</p>
          <p className="postal-format"><strong>AAB 1234</strong></p>
          <p>Donde <strong>AA</strong> es la provincia (letras) y <strong>B</strong> el distrito.</p>
          <ul>
            <li>Encontralo en tu DNI, debajo de la foto</li>
            <li>Consultá en la web de <strong>Correo Argentino</strong></li>
            <li>O preguntale a tu vendedor/a después de la compra</li>
          </ul>
        </div>
      </ProductModal>
    </>
  );
}
