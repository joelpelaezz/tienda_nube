import type { Metadata, Viewport } from 'next';
import './globals.css';
import CookieBar from '@/components/CookieBar';
import QuickShopProvider from '@/components/QuickShopProvider';
import Providers from '@/components/Providers';
import WhatsAppFloatingButton from '@/components/WhatsAppFloatingButton';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: 'Tienda Online de Tendencia Shop',
  description: 'Comprá productos de Tendencia Shop por internet. Envíos a todo el país. Pagá con tarjeta de crédito o efectivo.',
  openGraph: {
    title: 'Tienda Online de Tendencia Shop',
    description: 'Comprá productos de Tendencia Shop por internet. Envíos a todo el país. Pagá con tarjeta de crédito o efectivo.',
    url: 'https://www.tendenciashop.com.ar',
    siteName: 'Tendencia Shop',
    type: 'website',
    locale: 'es_AR',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es-AR">
      <body>
        <Providers>
          {children}
          <CookieBar />
          <QuickShopProvider />
          <WhatsAppFloatingButton />
        </Providers>
      </body>
    </html>
  );
}
