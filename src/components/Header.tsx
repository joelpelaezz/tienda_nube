'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useCartStore } from '@/lib/store';
import { usePathname } from 'next/navigation';
import LogoutButton from '@/components/LogoutButton';
import { formatPrice } from '@/lib/utils/format';

export default function Header() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [promoBar, setPromoBar] = useState({
    enabled: true,
    text: 'Descuentos exclusivos para comprar al por mayor - ¡contactanos!',
    link: '',
  });
  const [headerContact, setHeaderContact] = useState({
    storePhone: '',
    whatsappNumber: '',
    showPhoneInHeader: false,
  });
  // C4-TRACE: contact shown in the desktop header is governed by persisted store settings.
  const { items, toggleCart } = useCartStore();
  const pathname = usePathname();
  const { data: session } = useSession();

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    fetch('/api/store-settings')
      .then((response) => response.json())
      .then((settings: {
        promoBarEnabled?: boolean;
        promoBarText?: string;
        promoBarLink?: string;
        storePhone?: string;
        whatsappNumber?: string;
        showPhoneInHeader?: boolean;
      }) => {
        setPromoBar({
          enabled: settings.promoBarEnabled !== false,
          text: settings.promoBarText || 'Descuentos exclusivos para comprar al por mayor - ¡contactanos!',
          link: settings.promoBarLink || '',
        });
        setHeaderContact({
          storePhone: settings.storePhone || '',
          whatsappNumber: settings.whatsappNumber || '',
          showPhoneInHeader: settings.showPhoneInHeader === true,
        });
      })
      .catch(() => undefined);
  }, []);

  const headerPhone = headerContact.storePhone || headerContact.whatsappNumber;
  const normalizedHeaderPhone = headerPhone.replace(/\D/g, '');
  const headerPhoneHref = headerContact.storePhone
    ? `tel:${headerContact.storePhone.replace(/[^\d+]/g, '')}`
    : normalizedHeaderPhone
      ? `https://wa.me/${normalizedHeaderPhone}`
      : '';

  const promoContent = (mobile = false) => (
    <span className={`header-promo-track ${mobile ? 'header-promo-track--mobile' : ''}`}>
      <span>{promoBar.text}</span>
      <span aria-hidden="true"> · {promoBar.text}</span>
    </span>
  );

  const promoBarContent = (mobile = false) => promoBar.link ? (
    <a href={promoBar.link} className="header-promo-link" aria-label={promoBar.text}>
      {promoContent(mobile)}
    </a>
  ) : promoContent(mobile);

  const getPageName = () => {
    if (pathname === '/') return 'INICIO';
    if (pathname.startsWith('/productos')) return 'PRODUCTOS';
    if (pathname.startsWith('/contacto')) return 'CONTACTO';
    return 'INICIO';
  };

  return (
    <>
      {/* Barra superior - solo desktop */}
      <div className="header-top-bar hidden md:block">
        {promoBar.enabled && <div className="header-top-promo">{promoBarContent()}</div>}
        <div className="header-top-info container flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {headerContact.showPhoneInHeader && headerPhone && headerPhoneHref && (
              <a href={headerPhoneHref} className="hover:underline">
                {headerPhone}
              </a>
            )}
          </div>
          <div className="flex items-center space-x-4">
            {session?.user ? (
              <>
                <span className="text-sm text-gray-600">
                  Hola, <strong>{session.user.name || session.user.email}</strong>
                </span>
                <LogoutButton className="hover:underline text-sm" />
                {session.user.role === 'admin' && (
                  <Link href="/admin" className="hover:underline text-sm font-semibold">
                    Admin
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href="/registro" className="hover:underline">Crear cuenta</Link>
                <Link href="/ingresar" className="hover:underline">Iniciar sesión</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Barra promo mobile */}
      {promoBar.enabled && <div className="header-mobile-promo md:hidden">{promoBarContent(true)}</div>}

      {/* Header principal - desktop */}
      <header className="header-main hidden md:block">
        <div className="container">
          <div className="flex items-center justify-between py-3">
            <Link href="/" className="flex-shrink-0">
              <Image
                src="https://dcdn-us.mitiendanube.com/stores/005/154/974/themes/common/logo-1470273192-1725027146-d4ccbc266b0dfc03cd9ab1fea319470f1725027146-480-0.webp"
                alt="Tendencia Shop"
                width={240}
                height={64}
                className="h-16 w-auto"
              />
            </Link>
            <nav className="flex items-center space-x-8">
              <Link href="/" className="header-nav-link">Inicio</Link>
              <Link href="/productos/" className="header-nav-link">Productos</Link>
              <Link href="/contacto/" className="header-nav-link">Contacto</Link>
            </nav>
            <div className="flex items-center space-x-4">
              <div className="header-search">
                <span className="header-search-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </span>
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchQuery.trim()) {
                      window.location.href = `/productos/?q=${encodeURIComponent(searchQuery)}`;
                    }
                  }}
                  placeholder="Buscar"
                  className="header-search-input"
                />
              </div>
              <button onClick={toggleCart} className="header-cart">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {itemCount > 0 && <span className="header-cart-count">{itemCount}</span>}
                <span className="text-sm font-semibold">
                  {formatPrice(items.reduce((sum, item) => sum + item.price * item.quantity, 0))}
                </span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Header mobile */}
      <header className="md:hidden">
        {/* Fila 1: Hamburguesa | Nombre pagina | Buscar */}
        <div className="header-mobile-top">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="header-mobile-hamburger">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d={isMenuOpen ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
            </svg>
          </button>
          <span className="header-mobile-page-name">{getPageName()}</span>
          <button onClick={() => setIsSearchOpen(!isSearchOpen)} className="header-mobile-search">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        {/* Barra de busqueda expandible */}
        {isSearchOpen && (
          <div className="header-mobile-search-bar">
            <div className="flex items-center">
              <span className="header-search-icon">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    window.location.href = `/productos/?q=${encodeURIComponent(searchQuery)}`;
                  }
                }}
                placeholder="Buscar productos..."
                className="flex-1 header-search-input"
                autoFocus
              />
            </div>
          </div>
        )}

        {/* Menu hamburguesa expandible */}
        {isMenuOpen && (
          <div className="header-mobile-menu">
            <Link href="/" className="header-mobile-menu-link" onClick={() => setIsMenuOpen(false)}>
              Inicio
            </Link>
            <Link href="/productos/" className="header-mobile-menu-link" onClick={() => setIsMenuOpen(false)}>
              Productos
            </Link>
            <Link href="/contacto/" className="header-mobile-menu-link" onClick={() => setIsMenuOpen(false)}>
              Contacto
            </Link>
            {session?.user ? (
              <>
                <div className="px-4 py-2 text-sm text-gray-500">
                  {session.user.name || session.user.email}
                </div>
                <LogoutButton className="header-mobile-menu-link w-full text-left" />
                {session.user.role === 'admin' && (
                  <Link href="/admin" className="header-mobile-menu-link" onClick={() => setIsMenuOpen(false)}>
                    Panel Admin
                  </Link>
                )}
              </>
            ) : (
              <>
                <Link href="/registro" className="header-mobile-menu-link" onClick={() => setIsMenuOpen(false)}>
                  Crear cuenta
                </Link>
                <Link href="/ingresar" className="header-mobile-menu-link" onClick={() => setIsMenuOpen(false)}>
                  Iniciar sesión
                </Link>
              </>
            )}
          </div>
        )}

        {/* Barra inferior: INICIO | PRODUCTOS | CARRITO */}
        <nav className="header-mobile-bottom">
          <Link href="/" className="header-mobile-bottom-item">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>INICIO</span>
          </Link>
          <Link href="/productos/" className="header-mobile-bottom-item">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            <span>PRODUCTOS</span>
          </Link>
          <button onClick={toggleCart} className="header-mobile-bottom-item">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {itemCount > 0 && <span className="header-mobile-cart-badge">{itemCount}</span>}
            </div>
            <span>CARRITO</span>
          </button>
        </nav>
      </header>

      {/* Logo mobile - debajo del header */}
      <div className="md:hidden flex justify-center py-3 bg-white border-b border-gray-100">
        <Link href="/">
          <Image
            src="https://dcdn-us.mitiendanube.com/stores/005/154/974/themes/common/logo-1470273192-1725027146-d4ccbc266b0dfc03cd9ab1fea319470f1725027146-480-0.webp"
            alt="Tendencia Shop"
            width={240}
            height={64}
            className="h-16 w-auto"
          />
        </Link>
      </div>
    </>
  );
}
