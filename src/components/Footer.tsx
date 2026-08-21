import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  return (
    <>
      {/* Footer principal */}
      <footer className="footer">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {/* Navegación */}
            <div>
              <h4 className="footer-title">Navegación</h4>
              <ul className="footer-list">
                <li>
                  <Link href="/" className="hover:text-primary">
                    Inicio
                  </Link>
                </li>
                <li>
                  <Link href="/productos/" className="hover:text-primary">
                    Productos
                  </Link>
                </li>
                <li>
                  <Link href="/contacto/" className="hover:text-primary">
                    Contacto
                  </Link>
                </li>
              </ul>
            </div>

            {/* Medios de pago y envío */}
            <div>
              <h4 className="footer-title">Medios de pago</h4>
              <div className="footer-payment-icons">
                <Image
                  src="https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/payment/new_logos_payment/visa@2x.png"
                  alt="Visa"
                  width={48}
                  height={30}
                  className="footer-payment-icon"
                />
                <Image
                  src="https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/payment/new_logos_payment/mastercard@2x.png"
                  alt="Mastercard"
                  width={48}
                  height={30}
                  className="footer-payment-icon"
                />
                <Image
                  src="https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/payment/new_logos_payment/amex@2x.png"
                  alt="Amex"
                  width={48}
                  height={30}
                  className="footer-payment-icon"
                />
                <Image
                  src="https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/payment/new_logos_payment/ar/cabal@2x.png"
                  alt="Cabal"
                  width={48}
                  height={30}
                  className="footer-payment-icon"
                />
                <Image
                  src="https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/payment/new_logos_payment/ar/nativa@2x.png"
                  alt="Nativa"
                  width={48}
                  height={30}
                  className="footer-payment-icon"
                />
              </div>

              <h4 className="footer-title">Formas de envío</h4>
              <Image
                src="https://d26lpennugtm8s.cloudfront.net/assets/common/img/logos/shipping/api/9075@2x.png"
                alt="Andreani"
                width={80}
                height={30}
                className="footer-shipping-icon"
              />
            </div>

            {/* Contacto */}
            <div>
              <h4 className="footer-title">Contactanos</h4>
              <ul className="footer-list">
                <li className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  03883345437
                </li>
                <li className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href="mailto:joelpelaezz@gmail.com" className="hover:text-primary">
                    joelpelaezz@gmail.com
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Mina los Adobes n 1194
                </li>
              </ul>
            </div>
          </div>
        </div>
      </footer>

      {/* Footer legal */}
      <div className="footer-legal">
        <div className="container">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
              <p className="text-sm text-gray-500">
                Copyright Tendencia Shop - 20323692352 - 2026.
              </p>
              <a
                href="https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-primary transition-colors"
              >
                Defensa del consumidor
              </a>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>Hecho con</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              <span>en Tucumán</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
